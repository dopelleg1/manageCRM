import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Building, Search as SearchIcon, Home, UserPlus, Phone, Eye, Loader2, Store } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RecordDetailModal from '@/components/calendar/RecordDetailModal';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';

// Fix for default marker icons if they fallback (though we use custom divIcons)
// We avoid external CDN links if possible to reduce CSP/Origin issues, but these are standard leaflet fix.
// We'll wrap in try-catch to avoid strict CSP blocking 'self' origin errors during import if strict mode is on.
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
} catch (e) {
  console.warn("Leaflet icon setup failed, likely due to CSP restrictions", e);
}

const getMarkerIcon = (type, agentColor) => {
    const typeColors = {
        immobile: '#2563eb', 
        attivita: '#16a34a', 
        potential_tobacconist: '#f97316',
        potential_activity_acquirente: '#8b5cf6',
        potential_activity_venditore: '#ef4444',
        telemarketing: '#f59e0b',
    };
    const color = agentColor || typeColors[type] || '#6b7280'; 
    
    // Using simple SVG string avoids external image requests and CSP issues
    const iconHtml = `
        <svg viewBox="0 0 24 24" width="32" height="32" fill="${color}" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>`;

    return L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

const SharedMap = () => {
    const [activeFilters, setActiveFilters] = useState(['immobile', 'attivita', 'potential_tobacconist', 'potential_activity', 'telemarketing']);
    const [selectedAgent, setSelectedAgent] = useState('all');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast } = useToast();
    const { user, userRole } = useAuth();
    const { agents, properties, activities, potentialTobacconists, potentialActivities, telemarketing, loading, updateRecord } = useData();

    const agentMap = useMemo(() => {
        return agents.reduce((acc, agent) => {
            acc[agent.id] = agent;
            return acc;
        }, {});
    }, [agents]);

    const allPoints = useMemo(() => {
        const mapData = (items, type, recordType, titleKey, cityKey) => 
            (items || [])
                .filter(item => item.lat && item.lng)
                .map(item => {
                    const pointType = item.type && type === 'potential_activity' ? `${type}_${item.type}` : type;
                    return {
                        ...item,
                        type: pointType,
                        recordType,
                        title: `${item[titleKey] || ''} ${item.cognome || ''}`.trim(),
                        description: `${item.indirizzo || ''}, ${item[cityKey] || ''}`.trim(),
                        position: [item.lat, item.lng],
                        agentId: item.agente_id,
                    };
                });

        return [
            ...mapData(properties, 'immobile', 'Immobile', 'categoria', 'citta'),
            ...mapData(activities, 'attivita', 'Attività Commerciale', 'categoria', 'citta'),
            ...mapData(potentialTobacconists, 'potential_tobacconist', 'Potenziale Tabaccheria', 'nome', 'citta'),
            ...mapData(potentialActivities, 'potential_activity', 'Potenziale Attività', 'nome', 'citta'),
            ...mapData(telemarketing, 'telemarketing', 'Telemarketing', 'nome_azienda', 'citta'),
        ];
    }, [properties, activities, potentialTobacconists, potentialActivities, telemarketing]);

    const handleAddressSearch = () => {
        toast({
            title: "Ricerca Indirizzo 🗺️",
            description: "Questa funzionalità userà un servizio di geocodifica per trovare indirizzi e popolare automaticamente i campi. Richiedila nel prossimo prompt! 🚀",
        });
    };

    const toggleFilter = (filter) => {
        setActiveFilters(prev => 
            prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
        );
    };

    const filteredPoints = useMemo(() => {
        let userPoints = allPoints;
        if (userRole === 'agente' || userRole === 'telemarketing') {
            if (user) {
                userPoints = allPoints.filter(p => p.agentId === user.id);
            }
        }
        
        const agentFiltered = selectedAgent === 'all' 
            ? userPoints 
            : userPoints.filter(p => p.agentId === selectedAgent);

        return agentFiltered.filter(p => activeFilters.some(f => p.type.startsWith(f)));
    }, [activeFilters, allPoints, selectedAgent, userRole, user]);

    const handleViewDetails = (point) => {
        // We use a small timeout to allow any Leaflet events to clear
        setTimeout(() => {
            setSelectedRecord(point);
            setIsModalOpen(true);
        }, 10);
    };

    const handleSaveRecord = async (updatedRecord) => {
        const tableMap = {
            'Immobile': 'properties',
            'Attività Commerciale': 'commercial_activities',
            'Potenziale Tabaccheria': 'potential_tobacconists',
            'Potenziale Attività': 'potential_activities',
            'Telemarketing': 'telemarketing_contacts',
        };
        const tableName = tableMap[updatedRecord.recordType];
        if (!tableName) {
            toast({ title: "Errore", description: "Tipo di record non valido.", variant: "destructive" });
            return;
        }

        const { id, recordType, agent_name, full_code, ...restOfRecord } = updatedRecord;
        
        const { data, error } = await supabase
            .from(tableName)
            .update(restOfRecord)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            toast({ title: "Errore Aggiornamento", description: error.message, variant: "destructive" });
        } else {
            updateRecord(tableName, data);
            toast({
                title: "Record aggiornato! ✨",
                description: "Le modifiche sono state salvate nel database.",
            });
            setIsModalOpen(false);
        }
    };

    return (
        <>
            <div className="h-full w-full relative">
                <div className="absolute top-4 left-4 z-[1000] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 md:p-4 rounded-lg shadow-lg flex flex-col gap-2 md:gap-3 max-w-[calc(100%-2rem)]">
                    <div className="flex items-center gap-2">
                        <Input placeholder="Cerca indirizzo..." className="w-full md:w-64" />
                        <Button size="icon" onClick={handleAddressSearch}><SearchIcon className="h-4 w-4"/></Button>
                    </div>
                    
                    {userRole === 'admin' && (
                        <Select onValueChange={setSelectedAgent} defaultValue="all">
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Filtra per agente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tutti gli Agenti</SelectItem>
                                {agents.map(agent => (
                                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => toggleFilter('immobile')} variant={activeFilters.includes('immobile') ? 'default' : 'outline'} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                            <Home className="h-4 w-4 md:mr-2"/> <span className="hidden md:inline">Immobili</span>
                        </Button>
                        <Button onClick={() => toggleFilter('attivita')} variant={activeFilters.includes('attivita') ? 'default' : 'outline'} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                            <Building className="h-4 w-4 md:mr-2"/> <span className="hidden md:inline">Attività</span>
                        </Button>
                        <Button onClick={() => toggleFilter('potential_tobacconist')} variant={activeFilters.includes('potential_tobacconist') ? 'default' : 'outline'} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                            <Store className="h-4 w-4 md:mr-2"/> <span className="hidden md:inline">Tabaccherie</span>
                        </Button>
                        <Button onClick={() => toggleFilter('potential_activity')} variant={activeFilters.includes('potential_activity') ? 'default' : 'outline'} size="sm" className="bg-purple-500 hover:bg-purple-600 text-white">
                            <UserPlus className="h-4 w-4 md:mr-2"/> <span className="hidden md:inline">Potenziali</span>
                        </Button>
                        <Button onClick={() => toggleFilter('telemarketing')} variant={activeFilters.includes('telemarketing') ? 'default' : 'outline'} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                            <Phone className="h-4 w-4 md:mr-2"/> <span className="hidden md:inline">Telemarketing</span>
                        </Button>
                    </div>
                </div>
                {loading ? (
                    <div className="flex justify-center items-center h-full w-full bg-gray-100 dark:bg-gray-900">
                        <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    </div>
                ) : (
                    <MapContainer 
                        center={[45.0703, 7.6869]} 
                        zoom={10} 
                        scrollWheelZoom={true} 
                        className="h-full w-full"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            // Added crossOrigin attribute to help with CSP/CORS issues
                            crossOrigin="anonymous"
                        />
                        {filteredPoints.map(point => {
                            const agent = agentMap[point.agentId];
                            return (
                                <Marker key={`${point.recordType}-${point.id}`} position={point.position} icon={getMarkerIcon(point.type, agent?.color)}>
                                    <Popup>
                                        <div className="text-gray-800 w-60">
                                            <h3 className="font-bold text-lg">{point.title}</h3>
                                            <p>{point.description}</p>
                                            <p className="text-sm text-gray-500 mt-2">Agente: {agent?.name || 'N/A'}</p>
                                            <Button type="button" className="w-full mt-3" size="sm" onClick={() => handleViewDetails(point)}>
                                                <Eye className="h-4 w-4 mr-2" />
                                                Vedi Dettagli
                                            </Button>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                )}
            </div>
            {selectedRecord && (
                <RecordDetailModal
                    record={selectedRecord}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedRecord(null);
                    }}
                    onSave={handleSaveRecord}
                />
            )}
        </>
    );
};

export default SharedMap;
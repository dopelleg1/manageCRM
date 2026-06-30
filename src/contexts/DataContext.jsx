import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const generateColor = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

export const DataProvider = ({ children }) => {
    const [agents, setAgents] = useState([]);
    const [properties, setProperties] = useState([]);
    const [activities, setActivities] = useState([]);
    const [potentialTobacconists, setPotentialTobacconists] = useState([]);
    const [potentialActivities, setPotentialActivities] = useState([]);
    const [telemarketing, setTelemarketing] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [configurations, setConfigurations] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Super Admin View State
    const [superAdminFilterMine, setSuperAdminFilterMine] = useState(false);

    const { toast } = useToast();
    const { user, userRole } = useAuth();

    const toggleSuperAdminFilter = useCallback(() => {
        setSuperAdminFilterMine(prev => !prev);
    }, []);

    const fetchData = useCallback(async (tableName, setter, recordType) => {
        let query;
        if (tableName === 'potential_activities') {
            query = supabase.from(tableName).select('id, type, nome, cognome, telefono, email, indirizzo, lat, lng, citta, zona, regione, agente_id, note, data_richiamo, created_at, budget, locali, mq, bagni, aggi, ricavo, categoria, caratteristiche, stato_presa_in_carico, numero, stato, anagrafica_type, allegati_urls');
        } else {
            query = supabase.from(tableName).select('*');
        }
        
        const tablesWithAgentId = ['properties', 'commercial_activities', 'potential_tobacconists', 'potential_activities', 'appointments', 'telemarketing_contacts'];
        
        if (tablesWithAgentId.includes(tableName)) {
             if (userRole === 'agente') {
                query = query.eq('agente_id', user.id);
            } else if (userRole === 'super_admin' && superAdminFilterMine) {
                query = query.eq('agente_id', user.id);
            }
        }
        
        if (tableName === 'potential_activities') {
            query = query.order('created_at', { ascending: false });
        } else if (['commercial_activities', 'properties'].includes(tableName)) {
            query = query.order('numero', { ascending: false }); 
        } else if (tableName === 'potential_tobacconists') {
            query = query.order('created_at', { ascending: false });
        } else if (tableName === 'telemarketing_contacts') {
            query = query.order('created_at', { ascending: false });
        } else if (tableName === 'documents') {
            query = query.order('created_at', { ascending: false });
        }

        let allData = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        try {
            while (hasMore) {
                const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
                if (error) throw error;
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    if (data.length < pageSize) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
                page++;
                if (page > 50) hasMore = false; 
            }
        } catch (error) {
            toast({ title: `Errore caricamento ${tableName}`, description: error.message, variant: "destructive" });
            return [];
        }
        
        if (tableName === 'agents') {
            const agentsWithColors = allData.map(agent => ({
                ...agent,
                color: agent.color || generateColor(agent.id)
            }));
            setter(agentsWithColors);
            return agentsWithColors;
        }
        
        const formattedData = recordType ? allData.map(item => ({ ...item, recordType })) : allData;
        setter(formattedData);
        return formattedData;
    }, [toast, user, userRole, superAdminFilterMine]);

    const fetchAllData = useCallback(async () => {
        if (!user || !userRole) return;
        setLoading(true);
        
        const commonFetches = [
            fetchData('agents', setAgents, 'Agente'),
            fetchData('configurations', setConfigurations),
            fetchData('documents', setDocuments),
        ];

        let roleSpecificFetches = [];

        if (['admin', 'agente', 'telemarketing', 'super_admin'].includes(userRole)) {
             roleSpecificFetches = [
                fetchData('properties', setProperties, 'Immobile'),
                fetchData('commercial_activities', setActivities, 'Attività Commerciale'),
                fetchData('potential_tobacconists', setPotentialTobacconists, 'Potenziale Tabaccheria'),
                fetchData('potential_activities', setPotentialActivities, 'Potenziale Acquirente/Venditore'),
                fetchData('appointments', setAppointments, 'Appuntamento'),
            ];
        }
        
        if (['admin', 'telemarketing', 'super_admin'].includes(userRole)) {
             roleSpecificFetches.push(fetchData('telemarketing_contacts', setTelemarketing, 'Telemarketing'));
        }

        await Promise.all([...commonFetches, ...roleSpecificFetches]);
        setLoading(false);
    }, [fetchData, user, userRole]);

    useEffect(() => {
        if (userRole === 'super_admin') {
            fetchAllData();
        }
    }, [superAdminFilterMine, userRole]); 

    useEffect(() => {
        if(user) fetchAllData();
    }, [fetchAllData, user]);

    const updateRecord = (tableName, updatedRecord) => {
        const setterMap = {
            'agents': setAgents,
            'properties': setProperties,
            'commercial_activities': setActivities,
            'potential_tobacconists': setPotentialTobacconists,
            'potential_activities': setPotentialActivities,
            'telemarketing_contacts': setTelemarketing,
            'appointments': setAppointments,
            'configurations': setConfigurations,
            'documents': setDocuments,
        };
        const setter = setterMap[tableName];
        if (setter) {
            setter(prev => prev.map(item => item.id === updatedRecord.id ? { ...item, ...updatedRecord, recordType: item.recordType } : item));
        }
    };

    const updateRecordLocally = (tableName, recordId, updatedData) => {
        const setterMap = {
            'agents': setAgents,
            'properties': setProperties,
            'commercial_activities': setActivities,
            'potential_tobacconists': setPotentialTobacconists,
            'potential_activities': setPotentialActivities,
            'telemarketing_contacts': setTelemarketing,
            'appointments': setAppointments,
            'configurations': setConfigurations,
            'documents': setDocuments,
        };
        const setter = setterMap[tableName];
        if (setter) {
            // Check ownership to remove if no longer owner
            if (userRole === 'agente' || userRole === 'telemarketing') {
                const newAgenteId = updatedData.agente_id;
                const newOperatoreId = updatedData.operatore_id;
                
                const isStillOwner = (newAgenteId === user.id) || (newOperatoreId === user.id);
                
                if (!isStillOwner && (newAgenteId !== undefined || newOperatoreId !== undefined)) {
                     // Remove record locally
                     setter(prev => prev.filter(item => item.id !== recordId));
                     return;
                }
            }

            // Update record locally
            setter(prev => prev.map(item => item.id === recordId ? { ...item, ...updatedData, recordType: item.recordType } : item));
        }
    };

    const addRecord = (tableName, newRecord, recordType) => {
        const setterMap = {
            'agents': setAgents,
            'properties': setProperties,
            'commercial_activities': setActivities,
            'potential_tobacconists': setPotentialTobacconists,
            'potential_activities': setPotentialActivities,
            'telemarketing_contacts': setTelemarketing,
            'appointments': setAppointments,
            'configurations': setConfigurations,
            'documents': setDocuments,
        };
        const setter = setterMap[tableName];
        if (setter) {
            const recordToAdd = recordType ? { ...newRecord, recordType } : newRecord;
            setter(prev => [recordToAdd, ...prev]); 
        }
    };
    
    const deleteRecord = (tableName, recordId) => {
        const setterMap = {
            'configurations': setConfigurations,
            'potential_tobacconists': setPotentialTobacconists,
            'potential_activities': setPotentialActivities,
            'telemarketing_contacts': setTelemarketing,
            'properties': setProperties,
            'commercial_activities': setActivities,
            'documents': setDocuments,
        };
        const setter = setterMap[tableName];
        if (setter) {
            setter(prev => prev.filter(item => item.id !== recordId));
        }
    };

    const value = {
        agents,
        properties,
        activities,
        potentialTobacconists,
        potentialActivities,
        telemarketing,
        appointments,
        configurations,
        documents,
        loading,
        fetchAllData,
        updateRecord,
        updateRecordLocally,
        addRecord,
        deleteRecord,
        superAdminFilterMine,
        toggleSuperAdminFilter,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
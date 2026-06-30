import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Map, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import RecordDetailModal from '@/components/calendar/RecordDetailModal';
import ImportModal from '@/components/import/ImportModal';
import RemapCoordinatesModal from '@/components/RemapCoordinatesModal';
import AdminTableToolbar from '@/components/admin/AdminTableToolbar';
import DuplicatesManagementModal from '@/components/duplicates/DuplicatesManagementModal';
import { exportTableToCSV } from '@/utils/csvExportService';
import { useSessionStorage } from '@/hooks/useSessionStorage';
import SearchBar from '@/components/search/SearchBar';
import { useClientSearch } from '@/hooks/useClientSearch';
import { usePageStateManager } from '@/hooks/usePageStateManager';

const PropertiesPage = () => {
    const { toast } = useToast();
    const { properties, loading, fetchAllData } = useData();
    const { user } = useAuth();
    const { getFormData } = useSessionStorage();
    const { saveState, loadState } = usePageStateManager('properties_pageState');
    
    const { 
        searchTerm, 
        setSearchTerm, 
        filteredData, 
        filteredCount, 
        totalCount 
    } = useClientSearch(properties, 'properties');

    const [pageIndex, setPageIndex] = useState(0);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isRemapModalOpen, setIsRemapModalOpen] = useState(false);
    const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
    const documentManagerRef = useRef();

    useEffect(() => {
        const saved = loadState();
        if (saved) {
            if (saved.currentPage !== undefined) setPageIndex(saved.currentPage);
            if (saved.searchTerm !== undefined) setSearchTerm(saved.searchTerm);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        saveState({
            currentPage: pageIndex,
            searchTerm: searchTerm || "",
            filters: {},
            sortBy: [],
            expandedRows: {}
        });
    }, [pageIndex, searchTerm, saveState]);

    useEffect(() => {
        const draft = getFormData('properties', 'new');
        if (draft) {
             toast({
                title: "Bozza trovata",
                description: "Hai un immobile in fase di creazione.",
                action: <Button variant="outline" size="sm" onClick={() => {
                     setSelectedRecord({ recordType: 'Immobile' });
                     setIsDetailModalOpen(true);
                }}>Riprendi</Button>,
                duration: 10000,
             });
        }
    }, [getFormData, toast]);

    const handleImportSuccess = async () => { 
        toast({ title: "Importazione completata!", description: "Dati importati." }); 
        await fetchAllData(); 
    };
    
    const handleRemapClose = async () => { 
        setIsRemapModalOpen(false); 
        await fetchAllData(); 
    };

    const handleExport = async () => {
        try {
            if (!filteredData || filteredData.length === 0) {
                toast({ title: "Attenzione", description: "Nessun dato da esportare.", variant: "warning" });
                return;
            }
            toast({ title: "Export in corso..." });
            await exportTableToCSV('properties', filteredData);
            toast({ title: "Export completato", variant: "success" });
        } catch (error) {
            toast({ title: "Errore Export", variant: "destructive" });
        }
    };

    const handleDeleteAll = async () => {
        const { error } = await supabase.from('properties').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Successo", description: "Tutti gli immobili sono stati eliminati." }); 
            fetchAllData(); 
        }
    };

    const handleSaveNew = async (editedRecord) => {
        try {
            const { recordType, ...recordToSave } = editedRecord;
            if (!recordToSave.stato) recordToSave.stato = 'In vendita'; 
            if (!recordToSave.agente_id && user?.id) recordToSave.agente_id = user.id;

            const { error } = await supabase.from('properties').insert(recordToSave);
            if (error) throw error;

            toast({ title: "Salvato!", description: "Immobile creato.", className: "bg-green-50 border-green-200" });
            await fetchAllData();
            return { success: true };
        } catch (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
            return { success: false };
        }
    };

    const handleSaveUpdate = async (editedRecord) => {
        try {
            const { recordType, ...recordToSave } = editedRecord;
            const { error } = await supabase.from('properties').update(recordToSave).eq('id', recordToSave.id);
            if (error) throw error;
            toast({ title: "Aggiornato!", description: "Modifiche salvate." });
            await fetchAllData();
            return { success: true };
        } catch (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
            return { success: false };
        }
    };

    const columns = useMemo(() => [
        { 
            accessorFn: (row) => `${row.codice || ''} - ${row.numero || ''}`,
            id: 'codice_id',
            header: 'Codice - ID',
            cell: ({ row }) => {
                const { codice, numero } = row.original;
                return <span className="font-medium font-mono">{codice || 'N/A'} - {numero || 'N/A'}</span>;
            }
        },
        { accessorKey: 'citta', header: 'Città' },
        { 
            accessorKey: 'prezzo', 
            header: 'Prezzo',
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("prezzo"));
                if (isNaN(amount)) return "-";
                const tipologia = row.original.tipologia;
                const formatted = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount);
                return tipologia === 'Affitto' ? `${formatted}/mese` : formatted;
            }
        },
        { 
            accessorKey: 'telefono_proprietario', 
            header: 'Telefoni',
            cell: ({ row }) => {
                const phone1 = row.original.telefono_proprietario;
                const phone2 = row.original.phone_2;
                return (
                    <div className="flex flex-col gap-1 text-sm">
                        {phone1 && <a href={`tel:${phone1}`} className="text-blue-600 hover:underline">{phone1}</a>}
                        {phone2 && <a href={`tel:${phone2}`} className="text-blue-600 hover:underline">{phone2}</a>}
                        {!phone1 && !phone2 && <span className="text-gray-400">-</span>}
                    </div>
                );
            }
        },
        { accessorKey: 'stato', header: 'Stato' },
        { 
            accessorKey: 'allegati_urls', 
            header: 'Allegati',
            cell: ({ row }) => {
                const urls = row.original.allegati_urls;
                let list = [];
                try { list = typeof urls === 'string' ? JSON.parse(urls) : (urls || []); } catch(e) {}
                if (!Array.isArray(list) || list.length === 0) return <span className="text-gray-400">-</span>;
                return (
                    <a href={list[0]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                        <ExternalLink className="w-4 h-4 mr-1"/> {list.length} link
                    </a>
                );
            }
        },
        { id: "actions", cell: ({ row }) => <Button variant="ghost" size="sm" onClick={() => { setSelectedRecord(row.original); setIsDetailModalOpen(true); }}>Dettagli</Button> }
    ], []);

    return (
        <>
            <Helmet><title>Immobili</title></Helmet>
            <div className="container mx-auto py-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Immobili</h1>
                        <p className="text-muted-foreground mt-1">Gestione portafoglio immobiliare</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <SearchBar 
                            onSearch={setSearchTerm} 
                            placeholder="Cerca immobili..." 
                            resultsCount={filteredCount}
                            totalCount={totalCount}
                            initialValue={searchTerm}
                            className="w-full md:w-64"
                        />
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setIsRemapModalOpen(true)}>
                                <Map className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Rimappa</span>
                            </Button>
                            <Button onClick={() => { setSelectedRecord({ recordType: 'Immobile' }); setIsDetailModalOpen(true); }}>
                                <Plus className="mr-2 h-4 w-4"/> Aggiungi
                            </Button>
                        </div>
                    </div>
                </div>
                
                <AdminTableToolbar 
                    tableName="Immobili" 
                    onImport={() => setIsImportModalOpen(true)} 
                    onExport={handleExport}
                    onDeleteAll={handleDeleteAll}
                    onFindDuplicates={() => setIsDuplicatesModalOpen(true)}
                    hideSearch={true} 
                />
                
                <DataTable 
                    columns={columns} 
                    data={filteredData}
                    filterPlaceholder="Cerca..." 
                    pageIndex={pageIndex}
                    onPageIndexChange={setPageIndex}
                />
            </div>
            
            {selectedRecord && (
                <RecordDetailModal 
                    ref={documentManagerRef}
                    isOpen={isDetailModalOpen} 
                    onClose={() => setIsDetailModalOpen(false)} 
                    record={selectedRecord} 
                    onSave={!selectedRecord.id ? handleSaveNew : handleSaveUpdate}
                    isAdding={!selectedRecord.id}
                    tableName="properties"
                />
            )}
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={handleImportSuccess} tableName="properties"/>
            <RemapCoordinatesModal tableName="properties" isOpen={isRemapModalOpen} onClose={handleRemapClose} />
            
             <DuplicatesManagementModal 
                isOpen={isDuplicatesModalOpen}
                onClose={() => setIsDuplicatesModalOpen(false)}
                tableName="properties"
                keyField="codice" 
                onComplete={fetchAllData}
            />
        </>
    );
};
export default PropertiesPage;
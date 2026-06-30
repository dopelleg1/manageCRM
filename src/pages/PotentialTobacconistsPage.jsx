import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Map, ExternalLink, XCircle } from 'lucide-react';
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
import { useSearchStateManager } from '@/hooks/useSearchStateManager';
import { usePageStateManager } from '@/hooks/usePageStateManager';
import { RingLoader } from 'react-spinners';

const PotentialTobacconistsPage = () => {
    const { toast } = useToast();
    const { potentialTobacconists, loading, fetchAllData } = useData();
    const { user } = useAuth();
    const { getFormData } = useSessionStorage();

    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isRemapModalOpen, setIsRemapModalOpen] = useState(false);
    const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
    const documentManagerRef = useRef();

    // Search State Management
    const { searchState, saveSearchState, clearSearchState, hasPersistedState } = useSearchStateManager('potential_tobacconists');
    const { saveState: savePageState, loadState: loadPageState } = usePageStateManager('potential_tobacconists_pageState');
    const [cachedResults, setCachedResults] = useState(searchState?.searchResults || null);
    const [isRestored, setIsRestored] = useState(false);
    const [pageIndex, setPageIndex] = useState(0);

    const { 
        searchTerm, 
        setSearchTerm, 
        filteredData, 
        filteredCount, 
        totalCount 
    } = useClientSearch(potentialTobacconists, 'potential_tobacconists');

    // Restore search & page state on mount
    useEffect(() => {
        const savedPage = loadPageState();
        if (savedPage) {
            if (savedPage.currentPage !== undefined) setPageIndex(savedPage.currentPage);
            if (savedPage.searchTerm !== undefined && !searchState?.searchQuery) setSearchTerm(savedPage.searchTerm);
        }

        if (searchState?.searchQuery) {
            setSearchTerm(searchState.searchQuery);
        }
        setIsRestored(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save page state
    useEffect(() => {
        savePageState({
            currentPage: pageIndex,
            searchTerm: searchTerm || "",
            filters: {},
            sortBy: [],
            expandedRows: {}
        });
    }, [pageIndex, searchTerm, savePageState]);

    // Save search state when filters or data change
    useEffect(() => {
        if (!loading && isRestored) {
            saveSearchState(filteredData, {}, 1, searchTerm);
            setCachedResults(filteredData);
        }
    }, [searchTerm, filteredData, loading, isRestored, saveSearchState]);

    const handleClearFilters = () => {
        clearSearchState();
        setSearchTerm('');
        setCachedResults(null);
        setPageIndex(0);
        toast({ title: "Filtri azzerati", description: "La vista è stata ripristinata allo stato iniziale." });
    };

    useEffect(() => {
        const draft = getFormData('potential_tobacconists', 'new');
        if (draft) {
             toast({
                title: "Bozza trovata",
                description: "Riprendi la creazione della tabaccheria.",
                action: <Button variant="outline" size="sm" onClick={() => {
                     setSelectedRecord({ recordType: 'Potenziale Tabaccheria' });
                     setIsDetailModalOpen(true);
                }}>Riprendi</Button>,
             });
        }
    }, [getFormData, toast]);

    const handleImportSuccess = async () => { 
        toast({ title: "Importazione completata!" }); 
        await fetchAllData(); 
    };
    
    const handleRemapClose = async () => { setIsRemapModalOpen(false); await fetchAllData(); };

    const displayData = (loading && cachedResults) ? cachedResults : filteredData;
    const isActuallyLoading = loading && !cachedResults;

    const handleExport = async () => {
        try {
            if (!displayData || displayData.length === 0) {
                toast({ title: "Attenzione", description: "Nessun dato da esportare.", variant: "warning" });
                return;
            }
            toast({ title: "Export in corso..." });
            await exportTableToCSV('potential_tobacconists', displayData);
            toast({ title: "Export completato", variant: "success" });
        } catch (error) {
            toast({ title: "Errore Export", variant: "destructive" });
        }
    };

    const handleDeleteAll = async () => {
        const { error } = await supabase.from('potential_tobacconists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Successo", description: "Dati eliminati." }); 
            fetchAllData(); 
        }
    };

    const handleSwitchToRecord = async (recordId) => {
        toast({ title: "Caricamento record esistente..." });
        try {
            const { data, error } = await supabase
                .from('potential_tobacconists')
                .select('*')
                .eq('id', recordId)
                .single();
            if (error) throw error;
            if (data) {
                data.recordType = 'Potenziale Tabaccheria';
                setSelectedRecord(data);
                setIsDetailModalOpen(true);
            }
        } catch (error) {
            toast({ title: "Errore", description: "Impossibile caricare il record.", variant: "destructive" });
        }
    };

    const handleSaveNew = async (editedRecord) => {
        try {
            const { recordType, ...recordToSave } = editedRecord;
            if (!recordToSave.stato) recordToSave.stato = 'Da contattare';
            if (!recordToSave.agente_id && user?.id) recordToSave.agente_id = user.id;

            const { error } = await supabase.from('potential_tobacconists').insert(recordToSave);
            if (error) throw error;

            toast({ title: "Salvato!", description: "Tabaccheria creata.", className: "bg-green-50 border-green-200" });
            await fetchAllData();
            return { success: true };
        } catch (error) {
            toast({ title: "Errore salvataggio", description: error.message, variant: "destructive" });
            return { success: false };
        }
    };

    const handleSaveUpdate = async (editedRecord) => {
        try {
            const { recordType, ...recordToSave } = editedRecord;
            const { error } = await supabase.from('potential_tobacconists').update(recordToSave).eq('id', recordToSave.id);
            if (error) throw error;
            toast({ title: "Aggiornato!", description: "Modifiche salvate." });
            await fetchAllData();
            return { success: true };
        } catch (error) {
            toast({ title: "Errore aggiornamento", description: error.message, variant: "destructive" });
            return { success: false };
        }
    };

    const columns = useMemo(() => [
        { accessorKey: 'numero_rivendita', header: 'N. Rivendita' },
        { accessorKey: 'nome', header: 'Nome' },
        { accessorKey: 'cognome', header: 'Cognome' },
        { accessorKey: 'citta', header: 'Città' },
        { accessorKey: 'zona', header: 'Zona' },
        { 
            accessorKey: 'telefono', 
            header: 'Telefoni',
            cell: ({ row }) => {
                const phone1 = row.original.telefono;
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
        { id: "actions", cell: ({ row }) => <Button variant="ghost" onClick={() => { setSelectedRecord(row.original); setIsDetailModalOpen(true); }}>Dettagli</Button> }
    ], []);

    if (isActuallyLoading) {
        return <div className="flex items-center justify-center h-screen"><RingLoader color={"#36d7b7"} loading={loading} size={150} /></div>;
    }

    return (
        <>
            <Helmet><title>Potenziali Tabaccherie</title></Helmet>
            <div className="container mx-auto py-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold">Potenziali Tabaccherie</h1>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
                        <SearchBar 
                            onSearch={setSearchTerm} 
                            placeholder="Cerca tabaccherie..." 
                            resultsCount={displayData.length}
                            totalCount={totalCount || cachedResults?.length || 0}
                            initialValue={searchTerm}
                            className="w-full md:w-64"
                        />
                        {hasPersistedState && searchTerm && (
                            <Button variant="ghost" size="icon" onClick={handleClearFilters} title="Azzera filtri" className="text-muted-foreground hover:text-destructive">
                                <XCircle className="h-5 w-5" />
                            </Button>
                        )}
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setIsRemapModalOpen(true)}>
                                <Map className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Rimappa</span>
                            </Button>
                            <Button onClick={() => { setSelectedRecord({ recordType: 'Potenziale Tabaccheria' }); setIsDetailModalOpen(true); }}>
                                <Plus className="mr-2 h-4 w-4"/> Aggiungi
                            </Button>
                        </div>
                    </div>
                </div>
                
                <AdminTableToolbar 
                    tableName="Potenziali Tabaccherie" 
                    onImport={() => setIsImportModalOpen(true)} 
                    onExport={handleExport}
                    onDeleteAll={handleDeleteAll}
                    onFindDuplicates={() => setIsDuplicatesModalOpen(true)}
                    hideSearch={true}
                />
                
                <div className="relative">
                  {loading && cachedResults && (
                    <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded shadow z-10 m-2 flex items-center gap-1">
                       <RingLoader color={"#2563eb"} size={12} /> Aggiornamento in corso...
                    </div>
                  )}
                  <DataTable 
                    columns={columns} 
                    data={displayData} 
                    filterPlaceholder="Cerca..." 
                    pageIndex={pageIndex}
                    onPageIndexChange={setPageIndex}
                  />
                </div>
            </div>
            {selectedRecord && (
                <RecordDetailModal 
                    ref={documentManagerRef}
                    isOpen={isDetailModalOpen} 
                    onClose={() => setIsDetailModalOpen(false)} 
                    record={selectedRecord} 
                    onSave={!selectedRecord.id ? handleSaveNew : handleSaveUpdate}
                    isAdding={!selectedRecord.id}
                    tableName="potential_tobacconists"
                    onSwitchToRecord={handleSwitchToRecord}
                />
            )}
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={handleImportSuccess} tableName="potential_tobacconists"/>
            <RemapCoordinatesModal tableName="potential_tobacconists" isOpen={isRemapModalOpen} onClose={handleRemapClose} />
            
             <DuplicatesManagementModal 
                isOpen={isDuplicatesModalOpen}
                onClose={() => setIsDuplicatesModalOpen(false)}
                tableName="potential_tobacconists"
                keyField="telefono"
                onComplete={fetchAllData}
            />
        </>
    );
};
export default PotentialTobacconistsPage;
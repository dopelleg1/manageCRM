import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Map, RefreshCw, Trash2, ExternalLink, XCircle } from 'lucide-react';
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
import SearchBar from '@/components/search/SearchBar';
import { exportTableToCSV } from '@/utils/csvExportService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSessionStorage } from '@/hooks/useSessionStorage';
import { usePageStateManager } from '@/hooks/usePageStateManager';

const TelemarketingPage = () => {
    const { toast } = useToast();
    const { telemarketing, loading, fetchAllData } = useData();
    const { user } = useAuth();
    const { getFormData } = useSessionStorage();
    
    // Page State Management
    const { saveState, loadState, clearState, hasPersistedState } = usePageStateManager('telemarketing_pageState');
    const [isRestored, setIsRestored] = useState(false);
    
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isRemapModalOpen, setIsRemapModalOpen] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [expandedRows, setExpandedRows] = useState({});
    
    const documentManagerRef = useRef();

    // Restore state on mount
    useEffect(() => {
        const saved = loadState();
        if (saved) {
            if (saved.searchTerm !== undefined) setSearchTerm(saved.searchTerm);
            if (saved.pagination) setPagination(saved.pagination);
            if (saved.sorting) setSorting(saved.sorting);
            if (saved.columnFilters) setColumnFilters(saved.columnFilters);
            if (saved.expandedRows) setExpandedRows(saved.expandedRows);
        }
        setIsRestored(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save state on change
    useEffect(() => {
        if (isRestored) {
            saveState({ searchTerm, pagination, sorting, columnFilters, expandedRows });
        }
    }, [searchTerm, pagination, sorting, columnFilters, expandedRows, isRestored, saveState]);

    const handleClearFilters = () => {
        clearState();
        setSearchTerm('');
        setPagination({ pageIndex: 0, pageSize: 10 });
        setSorting([]);
        setColumnFilters([]);
        setExpandedRows({});
        toast({ title: "Filtri azzerati", description: "La vista è stata ripristinata allo stato iniziale." });
    };

    useEffect(() => {
        const draft = getFormData('telemarketing_contacts', 'new');
        if (draft) {
             toast({
                title: "Bozza trovata",
                description: "Hai un contatto in fase di creazione.",
                action: <Button variant="outline" size="sm" onClick={() => {
                     setSelectedRecord({ recordType: 'Telemarketing', anagrafica_type: 'AZIENDA' });
                     setIsDetailModalOpen(true);
                }}>Riprendi</Button>,
             });
        }
    }, [getFormData, toast]);

    const handleImportSuccess = async () => { 
        toast({ title: "Importazione completata!" }); 
        await fetchAllData(); 
    };
    
    const handleRemapClose = async () => { 
        setIsRemapModalOpen(false); 
        await fetchAllData(); 
    };

    const handleExport = async () => {
        try {
            if (!telemarketing || telemarketing.length === 0) {
                toast({ title: "Attenzione", description: "Nessun dato da esportare.", variant: "warning" });
                return;
            }
            toast({ title: "Export in corso..." });
            await exportTableToCSV('telemarketing_contacts', telemarketing);
            toast({ title: "Export completato", variant: "success" });
        } catch (error) {
            toast({ title: "Errore Export", variant: "destructive" });
        }
    };

    const handleDeleteAll = async () => {
        try {
            const { error } = await supabase.from('telemarketing_contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
            toast({ title: "Successo", description: "Tabella svuotata" });
            await fetchAllData();
        } catch (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
        }
    };

    const handleSaveNew = async (editedRecord) => {
        try {
            const { recordType, ...recordToSave } = editedRecord;
            if (!recordToSave.stato) recordToSave.stato = 'Da contattare';
            if (!recordToSave.agente_id && user?.id) recordToSave.agente_id = user.id;

            const { error } = await supabase.from('telemarketing_contacts').insert(recordToSave);
            if (error) throw error;

            toast({ title: "Salvato!", className: "bg-green-50 border-green-200 text-green-900" });
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
            const { error } = await supabase.from('telemarketing_contacts').update(recordToSave).eq('id', recordToSave.id);
            if (error) throw error;
            
            toast({ title: "Salvato!", className: "bg-green-50 border-green-200 text-green-900" });
            await fetchAllData();
            return { success: true };
        } catch (error) {
            toast({ title: "Errore aggiornamento", description: error.message, variant: "destructive" });
            return { success: false };
        }
    };

    const filteredData = useMemo(() => {
        if (!telemarketing) return [];
        if (!searchTerm) return telemarketing;

        const lowercasedTerm = searchTerm.toLowerCase();

        return telemarketing.filter(record => {
            return Object.values(record).some(value => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(lowercasedTerm);
            });
        });
    }, [telemarketing, searchTerm]);

    const columns = useMemo(() => [
        { 
            accessorKey: 'anagrafica_type', 
            header: 'Tipo',
            cell: ({ row }) => <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100">{row.getValue('anagrafica_type') || 'N/A'}</span>
        },
        { accessorKey: 'nome_azienda', header: 'Azienda' },
        { accessorKey: 'nome', header: 'Nome' },
        { accessorKey: 'cognome', header: 'Cognome' },
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
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'citta', header: 'Città' },
        { accessorKey: 'indirizzo', header: 'Indirizzo' },
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
            <Helmet><title>Telemarketing</title></Helmet>
            <div className="container mx-auto py-10 space-y-6">
                
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            Telemarketing
                            <span className="text-sm font-normal text-muted-foreground bg-slate-100 px-2 py-1 rounded-full border">
                                {loading ? '...' : `${telemarketing?.length || 0} contatti`}
                            </span>
                        </h1>
                        <p className="text-muted-foreground mt-1">Gestione liste contatti.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                         <Button variant="outline" onClick={() => setIsRemapModalOpen(true)}>
                            <Map className="mr-2 h-4 w-4" /> Rimappa
                        </Button>
                        <Button onClick={() => { setSelectedRecord({ recordType: 'Telemarketing', anagrafica_type: 'AZIENDA' }); setIsDetailModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                            <Plus className="mr-2 h-4 w-4"/> Aggiungi
                        </Button>
                    </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-2 w-full md:max-w-md">
                            <SearchBar
                                onSearch={setSearchTerm}
                                initialValue={searchTerm}
                                placeholder="Cerca in tutti i campi..."
                                resultsCount={filteredData?.length || 0}
                                totalCount={telemarketing?.length || 0}
                                className="w-full"
                            />
                            {hasPersistedState && (
                                <Button variant="ghost" size="icon" onClick={handleClearFilters} title="Azzera filtri" className="text-muted-foreground hover:text-destructive flex-shrink-0">
                                    <XCircle className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => fetchAllData()} title="Ricarica">
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Aggiorna
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" title="Elimina Tutto">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Svuota Tabella
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Confermi?</AlertDialogTitle><AlertDialogDescription>Svuoterà l'intera tabella dei contatti telemarketing.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAll} className="bg-red-600">Conferma</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                     </div>

                    <AdminTableToolbar 
                        tableName="Telemarketing" 
                        onImport={() => setIsImportModalOpen(true)}
                        onExport={handleExport}
                        onDeleteAll={handleDeleteAll}
                        hideSearch={true} 
                    />
                    
                    <DataTable 
                        columns={columns} 
                        data={filteredData || []} 
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        sorting={sorting}
                        onSortingChange={setSorting}
                        columnFilters={columnFilters}
                        onColumnFiltersChange={setColumnFilters}
                        expanded={expandedRows}
                        onExpandedChange={setExpandedRows}
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
                    startInEditMode={!selectedRecord.id}
                    tableName="telemarketing_contacts"
                />
            )}
            
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={handleImportSuccess} tableName="telemarketing_contacts"/>
            <RemapCoordinatesModal tableName="telemarketing_contacts" isOpen={isRemapModalOpen} onClose={handleRemapClose} />
        </>
    );
};

export default TelemarketingPage;
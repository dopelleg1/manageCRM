import React, { useState, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useData } from '@/contexts/DataContext';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Map, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RingLoader } from 'react-spinners';
import { motion } from 'framer-motion';
import RecordDetailModal from '@/components/calendar/RecordDetailModal';
import ImportModal from '@/components/import/ImportModal';
import RemapCoordinatesModal from '@/components/RemapCoordinatesModal';
import AdminTableToolbar from '@/components/admin/AdminTableToolbar';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { exportTableToCSV } from '@/utils/csvExportService';

const ActivitiesPage = () => {
  const { activities, agents, loading, fetchAllData, deleteRecord } = useData();
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRemapModalOpen, setIsRemapModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const documentManagerRef = useRef();

  const agentMap = useMemo(() => agents.reduce((acc, agent) => ({ ...acc, [agent.id]: agent.name }), {}), [agents]);

  const processedActivities = useMemo(() => {
    return activities.map(activity => ({
      ...activity,
      full_code: `${activity.codice || ''}-${activity.numero || ''}`,
      agent_name: agentMap[activity.agente_id] || 'Non assegnato',
    }));
  }, [activities, agentMap]);
  
  const handleAction = (action, activity) => {
    if (action === 'Dettagli') {
        setSelectedActivity(activity);
        setIsAdding(false);
        setIsModalOpen(true);
    } else if (action === 'Elimina') {
        setRecordToDelete(activity);
    }
  };

  const columns = useMemo(() => [
    { accessorKey: 'full_code', header: 'Codice' },
    { accessorKey: 'categoria', header: 'Categoria' },
    { accessorKey: 'citta', header: 'Città' },
    { accessorKey: 'indirizzo', header: 'Indirizzo' },
    { accessorKey: 'agent_name', header: 'Agente' },
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
    {
      id: 'actions',
      cell: ({ row }) => {
        const activity = row.original;
        const canEditOrDelete = ['admin', 'super_admin'].includes(userRole) || activity.agente_id === user.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Apri menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAction('Dettagli', activity)}>Dettagli</DropdownMenuItem>
                {canEditOrDelete && (
                    <DropdownMenuItem onClick={() => handleAction('Elimina', activity)} className="text-red-500">Elimina</DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [userRole, user?.id]);

  const handleCreateNew = () => {
    setSelectedActivity({ recordType: 'Attività Commerciale' });
    setIsAdding(true);
    setIsModalOpen(true);
  };
  
  const handleSaveNew = async (editedRecord) => {
    const { recordType, agent_name, full_code, ...recordToSave } = editedRecord;
    try {
        const { error } = await supabase.from('commercial_activities').insert(recordToSave);
        if (error) throw error;
        await fetchAllData();
        toast({ title: "Successo", description: "Nuova attività creata." });
        return { success: true };
    } catch (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
        return { success: false };
    }
  };

  const handleSaveUpdate = async (editedRecord) => {
      const { recordType, agent_name, full_code, ...recordToSave } = editedRecord;
      try {
          const { error } = await supabase.from('commercial_activities').update(recordToSave).eq('id', recordToSave.id);
          if (error) throw error;
          await fetchAllData();
          toast({ title: "Successo", description: "Attività aggiornata." });
          return { success: true };
      } catch (error) {
          toast({ title: "Errore", description: error.message, variant: "destructive" });
          return { success: false };
      }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    const { error } = await supabase.from('commercial_activities').delete().eq('id', recordToDelete.id);
    if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Successo", description: "Attività eliminata." });
        deleteRecord('commercial_activities', recordToDelete.id);
    }
    setRecordToDelete(null);
  };

  const handleDeleteAll = async () => {
      const { error } = await supabase.from('commercial_activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) toast({ title: "Errore", description: error.message, variant: "destructive" });
      else { toast({ title: "Successo", description: "Dati eliminati." }); fetchAllData(); }
  };

  const handleImportSuccess = async () => {
    toast({ title: "Importazione completata!", description: "I dati sono stati importati con successo." });
    await fetchAllData();
  };

  const handleExport = async () => {
      try {
          if (!processedActivities || processedActivities.length === 0) {
              toast({ title: "Attenzione", description: "Nessun dato da esportare.", variant: "warning" });
              return;
          }
          toast({ title: "Export in corso...", description: "Sto preparando il file CSV." });
          await exportTableToCSV('commercial_activities', processedActivities);
          toast({ title: "Export completato", variant: "success" });
      } catch (error) {
          toast({ title: "Errore Export", description: "Si è verificato un errore.", variant: "destructive" });
      }
  };
  
  const handleRemapClose = async () => { setIsRemapModalOpen(false); await fetchAllData(); };

  if (loading) return <div className="flex items-center justify-center h-screen"><RingLoader color={"#36d7b7"} loading={loading} size={150} /></div>;
  const canPerformActions = ['admin', 'super_admin', 'agente'].includes(userRole);

  return (
    <>
      <Helmet><title>Attività Commerciali - CRM</title></Helmet>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Attività Commerciali</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsRemapModalOpen(true)}>
                <Map className="mr-2 h-4 w-4" /> Rimappa Coordinate
            </Button>
            {canPerformActions && <Button onClick={handleCreateNew}><PlusCircle className="mr-2 h-4 w-4" /> Nuova Attività</Button>}
          </div>
        </div>
        
        <AdminTableToolbar 
            tableName="Attività Commerciali" 
            onImport={() => setIsImportModalOpen(true)} 
            onExport={handleExport}
            onDeleteAll={handleDeleteAll} 
        />
        <DataTable columns={columns} data={processedActivities} filterPlaceholder="Filtra attività..." />
      </motion.div>

      {isModalOpen && <RecordDetailModal ref={documentManagerRef} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} record={selectedActivity} onSave={isAdding ? handleSaveNew : handleSaveUpdate} isAdding={isAdding} startInEditMode={isAdding} />}
      
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={handleImportSuccess} tableName="commercial_activities" />
      <RemapCoordinatesModal tableName="commercial_activities" isOpen={isRemapModalOpen} onClose={handleRemapClose} />

      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Sei sicuro?</AlertDialogTitle><AlertDialogDescription>Azione irreversibile.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Elimina</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ActivitiesPage;
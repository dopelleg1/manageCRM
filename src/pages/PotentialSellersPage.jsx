import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import RecordDetailModal from '@/components/calendar/RecordDetailModal';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const PotentialSellersPage = () => {
    const { toast } = useToast();
    const { potentialSellers, agents, loading, addRecord, updateRecord } = useData();
    const { user } = useAuth();
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const newSellerTemplate = {
        recordType: 'Potenziale Venditore',
        nome: '',
        cognome: '',
        telefono: '',
        email: '',
        agente_id: user?.id || null,
        categoria: '',
        caratteristiche: '',
        stato_presa_in_carico: '',
        note: '',
        data_richiamo: null,
        indirizzo: '',
        citta: '',
        zona: '',
        regione: '',
    };

    const handleAdd = () => {
        setIsAddModalOpen(true);
    };

    const handleSaveNewSeller = async (newSellerData) => {
        const { recordType, ...dbData } = newSellerData;
        const { data, error } = await supabase
            .from('potential_sellers')
            .insert([dbData])
            .select()
            .single();

        if (error) {
            toast({
                title: "Errore! 😱",
                description: `Impossibile aggiungere il venditore: ${error.message}`,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Successo! 🎉",
                description: "Nuovo potenziale venditore aggiunto.",
            });
            addRecord('potential_sellers', data, 'Potenziale Venditore');
            setIsAddModalOpen(false);
        }
    };
    
    const handleSaveChanges = async (editedData) => {
        const { recordType, ...dbData } = editedData;
        const { data, error } = await supabase
            .from('potential_sellers')
            .update(dbData)
            .eq('id', editedData.id)
            .select()
            .single();

        if (error) {
            toast({
                title: "Errore! 😱",
                description: `Impossibile aggiornare il venditore: ${error.message}`,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Successo! ✨",
                description: "Venditore aggiornato con successo.",
            });
            updateRecord('potential_sellers', data);
            setIsDetailModalOpen(false);
            setSelectedRecord(null);
        }
    };

    const handleAction = (action, record) => {
        if (action === 'Dettagli' || action === 'Modifica') {
            setSelectedRecord({ ...record, recordType: 'Potenziale Venditore' });
            setIsDetailModalOpen(true);
        } else {
            toast({
                title: "Funzionalità in arrivo! 🚧",
                description: `La funzione '${action}' non è ancora implementata. Richiedila nel tuo prossimo prompt! 🚀`,
                variant: "destructive"
            });
        }
    }

    const columns = useMemo(() => [
        {
            accessorKey: 'categoria',
            header: 'Categoria',
        },
        {
            accessorKey: 'nome',
            header: 'Nome e Cognome',
            cell: ({ row }) => `${row.original.nome || ''} ${row.original.cognome || ''}`.trim(),
        },
        {
            accessorKey: 'telefono',
            header: 'Telefono',
        },
        {
            accessorKey: 'citta',
            header: 'Città',
        },
        {
            accessorKey: 'agente_id',
            header: 'Agente',
            cell: ({ row }) => agents.find(a => a.id === row.original.agente_id)?.name || 'N/A',
        },
        {
            accessorKey: 'stato_presa_in_carico',
            header: 'Presa in Carico',
        },
        {
            accessorKey: 'data_richiamo',
            header: 'Prossimo Richiamo',
            cell: ({ row }) => row.original.data_richiamo ? format(new Date(row.original.data_richiamo), 'dd MMM yyyy', { locale: it }) : 'N/D',
        },
        {
            id: "actions",
            cell: ({ row }) => {
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
                    <DropdownMenuItem onClick={() => handleAction('Dettagli', row.original)}>Dettagli</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('Modifica', row.original)}>Modifica</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAction('Documenti', row.original)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Documenti
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAction('Elimina', row.original)} className="text-red-500">Elimina</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            },
        },
    ], [agents]);

    return (
        <>
            <Helmet>
                <title>Potenziali Venditori - CRM Immobiliare</title>
                <meta name="description" content="Gestisci i tuoi potenziali venditori." />
            </Helmet>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Potenziali Venditori</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">Visualizza e gestisci la lista dei tuoi potenziali venditori.</p>
                    </div>
                    <Button onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Venditore
                    </Button>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <DataTable columns={columns} data={potentialSellers} filterColumn="nome" />
                    )}
                </div>
            </motion.div>
            {selectedRecord && (
                <RecordDetailModal 
                    record={selectedRecord} 
                    isOpen={isDetailModalOpen} 
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedRecord(null);
                    }}
                    onSave={handleSaveChanges}
                />
            )}
            {isAddModalOpen && (
                <RecordDetailModal
                    record={newSellerTemplate}
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleSaveNewSeller}
                    startInEditMode={true}
                    isAdding={true}
                />
            )}
        </>
    );
};

export default PotentialSellersPage;
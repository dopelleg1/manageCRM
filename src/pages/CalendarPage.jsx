import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CustomCalendar from '@/components/calendar/Calendar';
import RecordDetailModal from '@/components/calendar/RecordDetailModal';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const CalendarPage = () => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { updateRecord, addRecord } = useData();
  const { toast } = useToast();

  const handleEventClick = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const getTableName = (recordType) => {
    const typeMap = {
      'Attività Commerciale': 'commercial_activities',
      'Immobile': 'properties',
      // Corrected key to match what is used in Calendar.jsx and RecordDetailModal.jsx
      'Potenziale Acquirente/Venditore': 'potential_activities',
      'Potenziale Tabaccheria': 'potential_tobacconists',
      'Telemarketing': 'telemarketing_contacts',
      'Appuntamento': 'appointments',
    };
    return typeMap[recordType];
  };

  const handleSave = async (editedRecord) => {
    const { recordType, agent_name, full_code, full_name, ...recordToSave } = editedRecord;
    const tableName = getTableName(recordType);
    
    if (!tableName) {
        console.error('Invalid recordType:', recordType);
        toast({ title: "Errore", description: `Tipo di record non valido: ${recordType}`, variant: "destructive" });
        return;
    }

    const isUpdating = !!recordToSave.id;

    try {
        if (isUpdating) {
            const { data, error } = await supabase
                .from(tableName)
                .update(recordToSave)
                .eq('id', recordToSave.id)
                .select()
                .single();
            if (error) throw error;
            updateRecord(tableName, data);
            toast({ title: "Successo", description: "Record aggiornato con successo." });
        } else {
            const { data, error } = await supabase
                .from(tableName)
                .insert(recordToSave)
                .select()
                .single();
            if (error) throw error;
            addRecord(tableName, data, recordType);
            toast({ title: "Successo", description: "Nuovo record creato con successo." });
        }
        handleCloseModal();
    } catch (error) {
        toast({
            title: "Errore",
            description: `Impossibile salvare i dati: ${error.message}`,
            variant: "destructive",
        });
    }
  };

  return (
    <>
      <Helmet>
        <title>Calendario - CRM Immobiliare</title>
        <meta name="description" content="Calendario appuntamenti per agenti e telemarketing." />
      </Helmet>
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Calendario</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Panoramica delle scadenze e degli appuntamenti.</p>
        <div className="mt-8">
          <CustomCalendar onEventClick={handleEventClick} />
        </div>
      </div>
      {isModalOpen && selectedRecord && (
        <RecordDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          record={selectedRecord}
          onSave={handleSave}
        />
      )}
    </>
  );
};

export default CalendarPage;
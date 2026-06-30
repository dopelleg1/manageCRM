import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RingLoader } from 'react-spinners';
import { useData } from '@/contexts/DataContext';
import { Combobox } from '@/components/ui/combobox';
import { useFormDraftManager } from '@/hooks/useFormDraftManager';
import ImportSettingsPanel from '@/components/import/ImportSettingsPanel';

const ConfigSection = ({ title, configType }) => {
  const { configurations, loading: dataLoading, addRecord, updateRecord, deleteRecord } = useData();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Draft Manager for the new item input
  const DRAFT_KEY = `draft_config_new_${configType}`;
  const { draft, saveDraftField, clearDraft } = useFormDraftManager(DRAFT_KEY);

  const [newItem, setNewItem] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(dataLoading);
    if (!dataLoading) {
      const filteredItems = configurations
        .filter(c => c.type === configType)
        .sort((a, b) => a.value.localeCompare(b.value));
      setItems(filteredItems);
    }
  }, [dataLoading, configurations, configType]);

  // Restore draft
  useEffect(() => {
      if (draft && draft.newItem) {
          setNewItem(draft.newItem);
      }
  }, [draft]);

  const handleInputChange = (e) => {
      const val = e.target.value;
      setNewItem(val);
      saveDraftField('newItem', val);
  };

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    const { data, error } = await supabase
      .from('configurations')
      .insert({ type: configType, value: newItem.trim() })
      .select()
      .single();

    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } else {
      addRecord('configurations', data);
      setNewItem('');
      clearDraft(); // Clear on success
      toast({ title: 'Successo', description: 'Voce aggiunta correttamente.' });
    }
  };

  const handleDeleteItem = async (id) => {
    const { error } = await supabase.from('configurations').delete().eq('id', id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } else {
      deleteRecord('configurations', id);
      toast({ title: 'Successo', description: 'Voce eliminata correttamente.' });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.value.trim()) return;
    const { data, error } = await supabase
      .from('configurations')
      .update({ value: editingItem.value.trim() })
      .eq('id', editingItem.id)
      .select()
      .single();

    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } else {
      updateRecord('configurations', data);
      setEditingItem(null);
      toast({ title: 'Successo', description: 'Voce aggiornata correttamente.' });
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nuova voce..."
            value={newItem}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            className="dark:bg-gray-700 dark:text-white"
          />
          <Button onClick={handleAddItem} size="icon">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <RingLoader color={"#36d7b7"} size={40} />
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700"
                >
                  {editingItem?.id === item.id ? (
                    <>
                      <Input
                        value={editingItem.value}
                        onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateItem()}
                        className="dark:bg-gray-600 dark:text-white"
                      />
                      <div className="flex gap-1 ml-2">
                        <Button onClick={handleUpdateItem} size="icon" variant="ghost" className="text-green-500 hover:text-green-600"><Save className="h-4 w-4" /></Button>
                        <Button onClick={() => setEditingItem(null)} size="icon" variant="ghost" className="text-gray-500 hover:text-gray-600"><X className="h-4 w-4" /></Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{item.value}</span>
                      <div className="flex gap-1">
                        <Button onClick={() => setEditingItem(item)} size="icon" variant="ghost" className="text-blue-500 hover:text-blue-600"><Edit className="h-4 w-4" /></Button>
                        <Button onClick={() => handleDeleteItem(item.id)} size="icon" variant="ghost" className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ConfigurationPage = () => {
  return (
    <>
      <Helmet>
        <title>Configurazione - CRM Immobiliare</title>
        <meta name="description" content="Gestisci le configurazioni del sistema CRM." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Pannello di Configurazione</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Gestisci i valori dei menu a tendina e le impostazioni di importazione.
        </p>
        
        {/* Import Settings Panel Added Here */}
        <ImportSettingsPanel />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ConfigSection title="Categorie Attività" configType="categoria_attivita" />
          <ConfigSection title="Stati Attività (anche per Potenziali)" configType="stato_attivita" />
          <ConfigSection title="Categorie Immobili" configType="categoria_immobile" />
          <ConfigSection title="Tipologie Immobili" configType="tipologia_immobile" />
          <ConfigSection title="Stati Immobili" configType="stato_immobile" />
          <ConfigSection title="Caratteristiche Immobili" configType="caratteristica_immobile" />
          <ConfigSection title="Distributore Tabaccheria" configType="distributore_tabaccheria" />
          <ConfigSection title="Stato Tabaccheria" configType="stato_tabaccheria" />
        </div>
      </motion.div>
    </>
  );
};

export default ConfigurationPage;
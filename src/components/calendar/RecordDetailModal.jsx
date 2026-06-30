import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Save, X, UserPlus, Loader2, Trash2, AlertCircle, Link as LinkIcon, ExternalLink, Plus } from 'lucide-react';
import AddressAutocomplete from '@/components/map/AddressAutocomplete';
import { useData } from '@/contexts/DataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AssignAgentModal from '@/components/telemarketing/AssignAgentModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/customSupabaseClient';
import ConfigurableSelect from '@/components/ui/ConfigurableSelect';
import { useConfigurableFields } from '@/hooks/useConfigurableFields';
import { validateConfigurableFields } from '@/utils/configurableFieldsValidation';
import { useFormDraftManager } from '@/hooks/useFormDraftManager';
import { useDuplicatePhoneCheck } from '@/hooks/useDuplicatePhoneCheck';
import DuplicatePhoneWarning from '@/components/ui/DuplicatePhoneWarning';
import DuplicatePhoneModal from '@/components/ui/DuplicatePhoneModal';
import { useAgentChangeDetection } from '@/hooks/useAgentChangeDetection';
import ConfirmChangeAgentModal from '@/components/ui/ConfirmChangeAgentModal';

const EditableDetailItem = ({ label, value, isEditing, onChange, type = 'text', children, textareaProps, warningComponent, placeholder }) => (
    <div className="grid grid-cols-3 items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700 relative">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 col-span-1">{label}</span>
        <div className="col-span-2">
            {isEditing ? (
                children || (type === 'textarea' ? (
                    <Textarea value={value || ''} onChange={onChange} {...textareaProps} placeholder={placeholder} />
                ) : (
                    <Input
                        className="h-8"
                        type={type}
                        value={value || ''}
                        onChange={onChange}
                        placeholder={placeholder}
                    />
                ))
            ) : (
                <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{value || 'N/A'}</span>
            )}
            {isEditing && warningComponent}
        </div>
    </div>
);

const AddressField = ({ isEditing, record, onAddressSelect }) => (
    <div className="grid grid-cols-3 items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 col-span-1">Indirizzo</span>
        <div className="col-span-2">
            {isEditing ? (
                <AddressAutocomplete 
                    initialValue={record.indirizzo}
                    onAddressSelect={onAddressSelect}
                />
            ) : (
                <span className="text-sm text-gray-900 dark:text-gray-100">{record.indirizzo || 'N/A'}</span>
            )}
        </div>
    </div>
);

const AgentSelector = ({ label = "Agente", isEditing, record, onChange, agents }) => {
    const { userRole } = useAuth();
    const agent = agents.find(a => a.id === record.agente_id);

    if (isEditing) {
        return (
            <div className="grid grid-cols-3 items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 col-span-1">{label}</span>
                <div className="col-span-2">
                    <Select value={record.agente_id || ''} onValueChange={onChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleziona un agente" />
                        </SelectTrigger>
                        <SelectContent>
                            {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 col-span-1">{label}</span>
            <div className="col-span-2">
                <span className="text-sm text-gray-900 dark:text-gray-100">{agent?.name || 'Non Assegnato'}</span>
            </div>
        </div>
    );
};

const getTableNameFromRecordType = (recordType) => {
    if (!recordType) return null;
    const normalized = recordType.toLowerCase().trim();
    if (normalized.includes('immobile')) return 'properties';
    if (normalized.includes('commercial') || normalized.includes('attivita') || normalized.includes('attività')) return 'commercial_activities';
    if (normalized.includes('tabaccheria')) return 'potential_tobacconists';
    if (normalized.includes('acquirente') || normalized.includes('venditore')) return 'potential_activities';
    if (normalized.includes('telemarketing')) return 'telemarketing_contacts';
    if (normalized.includes('appuntamento')) return 'appointments';
    return null;
}

const RecordDetailModal = forwardRef(({ record, isOpen, onClose, startInEditMode = false, onSave, isAdding = false, onDebugLog, tableName: propTableName, onSwitchToRecord }, ref) => {
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isConfigAlertOpen, setIsConfigAlertOpen] = useState(false);
  const [isConfirmAgentModalOpen, setIsConfirmAgentModalOpen] = useState(false);
  const [pendingConfigField, setPendingConfigField] = useState(null);
  const { fieldExists, addNewOption } = useConfigurableFields();
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');

  useImperativeHandle(ref, () => ({
    uploadDirectly: async () => true, 
  }));

  const { toast } = useToast();
  const { agents, deleteRecord, addRecord, updateRecordLocally, fetchAllData } = useData();
  const { user, userRole } = useAuth();

  const tableName = useMemo(() => {
      if (propTableName) return propTableName;
      return record ? getTableNameFromRecordType(record.recordType) : null;
  }, [record, propTableName]);

  const DRAFT_KEY = `draft_${tableName}_${record?.id || 'new'}`;
  const { draft, saveDraftObject, clearDraft } = useFormDraftManager(DRAFT_KEY);

  const initialRecord = useMemo(() => {
      if (!record) return null;
      let initial = { ...record };
      
      if (isAdding && !initial.agente_id && user && record.recordType !== 'Telemarketing') {
        initial.agente_id = user.id;
      }
      if (record.recordType === 'Potenziale Acquirente/Venditore' && !initial.type) {
          initial.type = 'acquirente';
      }
      
      if (typeof initial.allegati_urls === 'string') {
          try {
              initial.allegati_urls = JSON.parse(initial.allegati_urls);
          } catch(e) {
              initial.allegati_urls = [];
          }
      }
      if (!Array.isArray(initial.allegati_urls)) {
          initial.allegati_urls = [];
      }
      return initial;
  }, [record, isAdding, user]);

  const [editedRecord, setEditedRecord] = useState(initialRecord);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { hasChanged: hasAgentChanged, shouldShowModal: shouldShowAgentChangeModal } = useAgentChangeDetection(
      initialRecord?.agente_id,
      editedRecord?.agente_id,
      userRole
  );

  useEffect(() => {
    if (isOpen && tableName && initialRecord) {
        // Fix for infinite loop: Remove draft from dependency array
        // We only want to load the draft once when the modal is opened
        if (draft) {
            setEditedRecord({ ...initialRecord, ...draft });
            setHasUnsavedChanges(true);
        } else {
             setEditedRecord(initialRecord);
             setHasUnsavedChanges(false);
        }
        setNewUrl('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tableName, initialRecord]); // Important: Do NOT include draft here

  const updateRecordState = (newData) => {
      setEditedRecord(newData);
      saveDraftObject(newData);
      setHasUnsavedChanges(true);
  };

  useEffect(() => {
      setIsEditing(startInEditMode || isAdding);
  }, [startInEditMode, isAdding]);

  const checkPhoneField = editedRecord?.telefono || editedRecord?.telefono_proprietario || '';
  const { isDuplicate, duplicateRecord, isLoading: isCheckingDuplicate, error: duplicateCheckError } = useDuplicatePhoneCheck(
      tableName,
      checkPhoneField,
      record?.id
  );

  const duplicateWarning = useMemo(() => (
      <DuplicatePhoneWarning 
          isDuplicate={isDuplicate} 
          duplicateRecord={duplicateRecord} 
          isLoading={isCheckingDuplicate} 
      />
  ), [isDuplicate, duplicateRecord, isCheckingDuplicate]);

  if (!record || !editedRecord) return null;

  const canEditRecord = ['admin', 'super_admin'].includes(userRole) || (initialRecord?.agente_id === user?.id) || isAdding || record.recordType === 'Telemarketing';

  const handleInputChange = (field, value) => {
    const newData = { ...editedRecord, [field]: value };
    updateRecordState(newData);
  };

  const handleAddressSelect = (addressData) => {
    let updatedAddress = { ...addressData };
    if(record.recordType === 'Telemarketing') {
        delete updatedAddress.zona;
    }
    const newData = { ...editedRecord, ...updatedAddress };
    updateRecordState(newData);
  };

  const handleAddUrl = () => {
      if (!newUrl.trim()) return;
      let urlToAdd = newUrl.trim();
      if (!urlToAdd.startsWith('http://') && !urlToAdd.startsWith('https://')) {
          urlToAdd = 'https://' + urlToAdd;
      }
      const currentUrls = Array.isArray(editedRecord.allegati_urls) ? editedRecord.allegati_urls : [];
      const updatedUrls = [...currentUrls, urlToAdd];
      handleInputChange('allegati_urls', updatedUrls);
      setNewUrl('');
  };

  const handleRemoveUrl = (indexToRemove) => {
      const currentUrls = Array.isArray(editedRecord.allegati_urls) ? editedRecord.allegati_urls : [];
      const updatedUrls = currentUrls.filter((_, index) => index !== indexToRemove);
      handleInputChange('allegati_urls', updatedUrls);
  };

  const handleClose = () => {
      clearDraft();
      onClose();
  };
  
  const handleCancel = () => {
      clearDraft();
      onClose();
  };

  const confirmAndAddOption = async () => {
      if (!pendingConfigField) return;
      try {
          setIsSaving(true);
          await addNewOption(pendingConfigField.missingField, pendingConfigField.missingValue);
          toast({ title: "Configurazione Aggiornata", description: `"${pendingConfigField.missingValue}" è stato aggiunto.` });
          setIsConfigAlertOpen(false);
          setPendingConfigField(null);
          await proceedWithSave();
      } catch (error) {
          toast({ title: "Errore", description: "Impossibile aggiungere la nuova opzione.", variant: "destructive" });
          setIsSaving(false);
      }
  };

  const handleSave = async () => {
    if (isDuplicate && isAdding) {
        if (duplicateRecord) {
            setShowDuplicateModal(true);
            return;
        }
    }

    if (record.recordType === 'Potenziale Acquirente/Venditore' && !editedRecord.type) {
        toast({
            title: "Dati Mancanti",
            description: <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/> La tipologia è obbligatoria.</div>,
            variant: "destructive"
        });
        return;
    }

    let configMap = {};
    if (record.recordType === 'Attività Commerciale') {
        configMap = { 'categoria': 'categoria_attivita', 'stato': 'stato_attivita' };
    } else if (record.recordType === 'Immobile') {
        configMap = { 'categoria': 'categoria_immobile', 'tipologia': 'tipologia_immobile', 'stato': 'stato_immobile' };
    } else if (record.recordType === 'Potenziale Tabaccheria') {
        configMap = { 'categoria': 'categoria_attivita', 'stato': 'stato_attivita', 'distributore': 'distributore_tabaccheria' };
    } else if (record.recordType === 'Telemarketing') {
        configMap = { 'categoria': 'categoria_attivita', 'stato': 'stato_attivita' };
    } else if (record.recordType === 'Potenziale Acquirente/Venditore') {
        configMap = { 'categoria': 'categoria_attivita', 'stato': 'stato_attivita' };
    }

    const validation = validateConfigurableFields(editedRecord, configMap, fieldExists);

    if (!validation.valid) {
        setPendingConfigField(validation);
        setIsConfigAlertOpen(true);
        return;
    }

    if (shouldShowAgentChangeModal && !isAdding) {
        setIsConfirmAgentModalOpen(true);
        return;
    }

    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    if (!canEditRecord) {
        toast({ title: "Permesso negato", description: "Non hai i permessi per modificare questo record.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    let result = { success: false };

    try {
        const cleanData = { ...editedRecord };
        delete cleanData.recordType;

        if (onSave) {
            result = await onSave(editedRecord);
        } else {
             if (isAdding) {
                 const { data, error } = await supabase
                     .from(tableName)
                     .insert([cleanData])
                     .select()
                     .single();

                 if (error) throw error;
                 addRecord(tableName, data, record.recordType);
                 toast({ title: "Item Salvato!", className: "bg-green-50 border-green-200" });
                 result = { success: true };
             } else {
                 const { data, error } = await supabase
                     .from(tableName)
                     .update(cleanData)
                     .eq('id', editedRecord.id)
                     .select()
                     .single();

                 if (error) throw error;
                 
                 updateRecordLocally(tableName, editedRecord.id, data);
                 
                 toast({ title: "Item Aggiornato!", className: "bg-green-50 border-green-200" });
                 result = { success: true };
             }
        }

    } catch (error) {
        toast({ 
            title: "Errore imprevisto", 
            description: `Si è verificato un errore durante il salvataggio: ${error.message}`, 
            variant: "destructive" 
        });
    } finally {
        setIsSaving(false);
        if (result && result.success) {
            clearDraft(); 
            onClose();
        }
    }
  };

  const handleDelete = async () => {
      setIsSaving(true); 
      try {
          const { error } = await supabase
              .from(tableName)
              .delete()
              .eq('id', record.id);
          
          if (error) throw error;
          toast({ 
              title: "Record eliminato con successo", 
              className: "bg-green-50 border-green-200" 
          });
          if (deleteRecord) {
              deleteRecord(tableName, record.id);
          }
          clearDraft();
          onClose(); 
      } catch (error) {
          toast({ 
              title: "Errore durante l'eliminazione", 
              description: error.message, 
              variant: "destructive" 
          });
      } finally {
          setIsSaving(false);
          setIsDeleteAlertOpen(false);
      }
  };

  const handleAssign = () => {
    if (!editedRecord.agente_id) {
        toast({ title: "Agente non selezionato", description: "Seleziona un agente prima di procedere.", variant: "destructive" });
        return;
    }
    setIsAssignModalOpen(true);
  };
  
  const handleAssignmentComplete = () => {
      onClose();
  };

  const renderRecordDetails = () => {
    switch (record.recordType) {
      case 'Attività Commerciale':
        return (
          <>
            <div className="grid grid-cols-3 items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 col-span-1">Codice</span>
                <div className="col-span-2">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Input className="h-8 w-20" placeholder="ABC" maxLength="3" value={editedRecord.codice || ''} onChange={(e) => handleInputChange('codice', e.target.value.toUpperCase())}/>
                            <Input className="h-8 w-24" placeholder="1234" type="number" value={editedRecord.numero || ''} onChange={(e) => handleInputChange('numero', e.target.value)}/>
                        </div>
                    ) : ( <span className="text-sm text-gray-900 dark:text-gray-100">{`${editedRecord.codice || 'N/A'}-${editedRecord.numero || 'N/A'}`}</span> )}
                </div>
            </div>
            <EditableDetailItem label="Categoria" value={editedRecord.categoria} isEditing={isEditing}>
                <ConfigurableSelect fieldName="categoria_attivita" value={editedRecord.categoria} onChange={(value) => handleInputChange('categoria', value)} />
            </EditableDetailItem>
            <EditableDetailItem label="Stato" value={editedRecord.stato} isEditing={isEditing}>
                <ConfigurableSelect fieldName="stato_attivita" value={editedRecord.stato} onChange={(value) => handleInputChange('stato', value)} />
            </EditableDetailItem>
            <AgentSelector isEditing={isEditing} record={editedRecord} onChange={(value) => handleInputChange('agente_id', value)} agents={agents} />
            <AddressField isEditing={isEditing} record={editedRecord} onAddressSelect={handleAddressSelect} />
            <EditableDetailItem label="Città" value={editedRecord.citta} isEditing={isEditing} onChange={(e) => handleInputChange('citta', e.target.value)} />
            <EditableDetailItem label="Zona" value={editedRecord.zona} isEditing={isEditing} onChange={(e) => handleInputChange('zona', e.target.value)} />
            <EditableDetailItem label="Regione" value={editedRecord.regione} isEditing={isEditing} onChange={(e) => handleInputChange('regione', e.target.value)} />
            <EditableDetailItem label="MQ" value={editedRecord.mq} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('mq', e.target.value)} />
            <EditableDetailItem label="Prezzo Vendita" value={isEditing ? editedRecord.prezzo : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(editedRecord.prezzo || 0)} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('prezzo', e.target.value)} />
            <EditableDetailItem label="Aggi" value={isEditing ? editedRecord.aggi : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(editedRecord.aggi || 0)} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('aggi', e.target.value)} />
            <EditableDetailItem label="Ricavo" value={isEditing ? editedRecord.ricavo : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(editedRecord.ricavo || 0)} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('ricavo', e.target.value)} />
            <EditableDetailItem label="Proprietario" value={`${editedRecord.nome_proprietario || ''} ${editedRecord.cognome_proprietario || ''}`} isEditing={isEditing} onChange={(e) => { const [nome, ...cognome] = e.target.value.split(' '); handleInputChange('nome_proprietario', nome); handleInputChange('cognome_proprietario', cognome.join(' ')); }} />
            <EditableDetailItem label="Telefono Prop." value={editedRecord.telefono_proprietario} isEditing={isEditing} type="tel" onChange={(e) => handleInputChange('telefono_proprietario', e.target.value)} warningComponent={duplicateWarning} />
            <EditableDetailItem label="Secondo Telefono" value={editedRecord.phone_2} isEditing={isEditing} type="tel" placeholder="+39 XXX XXX XXXX" onChange={(e) => handleInputChange('phone_2', e.target.value)} />
            <EditableDetailItem label="Email Prop." value={editedRecord.email_proprietario} isEditing={isEditing} type="email" onChange={(e) => handleInputChange('email_proprietario', e.target.value)} />
            <EditableDetailItem label="Scadenza Mandato" value={isEditing ? (editedRecord.scadenza_mandato ? format(new Date(editedRecord.scadenza_mandato), 'yyyy-MM-dd') : '') : (editedRecord.scadenza_mandato ? format(new Date(editedRecord.scadenza_mandato), 'dd/MM/yyyy') : 'N/A')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('scadenza_mandato', e.target.value)} />
            <EditableDetailItem label="Data Richiamo" value={isEditing ? (editedRecord.data_richiamo ? format(new Date(editedRecord.data_richiamo), 'yyyy-MM-dd') : '') : (editedRecord.data_richiamo ? format(new Date(editedRecord.data_richiamo), 'dd/MM/yyyy') : 'N/A')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('data_richiamo', e.target.value)} />
            <EditableDetailItem label="Data Vetrina" value={isEditing ? (editedRecord.vetrina ? format(new Date(editedRecord.vetrina), 'yyyy-MM-dd') : '') : (editedRecord.vetrina ? format(new Date(editedRecord.vetrina), 'dd/MM/yyyy') : 'Non in vetrina')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('vetrina', e.target.value)} />
            <EditableDetailItem label="Note" value={editedRecord.note} isEditing={isEditing} type="textarea" onChange={(e) => handleInputChange('note', e.target.value)} textareaProps={{ className: "h-20" }} />
          </>
        );
      case 'Immobile':
        return (
          <>
            <div className="grid grid-cols-3 items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 col-span-1">Codice - ID</span>
                <div className="col-span-2">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Input className="h-8 w-20" placeholder="IMM" maxLength="3" value={editedRecord.codice || ''} onChange={(e) => handleInputChange('codice', e.target.value.toUpperCase())}/>
                            <Input className="h-8 w-24" placeholder="1234" type="number" value={editedRecord.numero || ''} onChange={(e) => handleInputChange('numero', e.target.value)}/>
                        </div>
                    ) : ( <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{`${editedRecord.codice || 'N/A'} - ${editedRecord.numero || 'N/A'}`}</span>)}
                </div>
            </div>
            <EditableDetailItem label="Categoria" value={editedRecord.categoria} isEditing={isEditing}>
                <ConfigurableSelect fieldName="categoria_immobile" value={editedRecord.categoria} onChange={(value) => handleInputChange('categoria', value)} />
            </EditableDetailItem>
            <EditableDetailItem label="Tipologia" value={editedRecord.tipologia} isEditing={isEditing}>
                <ConfigurableSelect fieldName="tipologia_immobile" value={editedRecord.tipologia} onChange={(value) => handleInputChange('tipologia', value)} />
            </EditableDetailItem>
            <EditableDetailItem label="Stato" value={editedRecord.stato} isEditing={isEditing}>
                <ConfigurableSelect fieldName="stato_immobile" value={editedRecord.stato} onChange={(value) => handleInputChange('stato', value)} />
            </EditableDetailItem>
            <AgentSelector isEditing={isEditing} record={editedRecord} onChange={(value) => handleInputChange('agente_id', value)} agents={agents}/>
            <AddressField isEditing={isEditing} record={editedRecord} onAddressSelect={handleAddressSelect} />
            <EditableDetailItem label="Città" value={editedRecord.citta} isEditing={isEditing} onChange={(e) => handleInputChange('citta', e.target.value)} />
            <EditableDetailItem label="Zona" value={editedRecord.zona} isEditing={isEditing} onChange={(e) => handleInputChange('zona', e.target.value)} />
            <EditableDetailItem label="Regione" value={editedRecord.regione} isEditing={isEditing} onChange={(e) => handleInputChange('regione', e.target.value)} />
            <EditableDetailItem label="Prezzo" value={isEditing ? editedRecord.prezzo : `${new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(editedRecord.prezzo || 0)} ${editedRecord.tipologia === 'Affitto' ? '/mese' : ''}`} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('prezzo', e.target.value)} />
            <EditableDetailItem label="MQ" value={editedRecord.mq} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('mq', e.target.value)} />
            <EditableDetailItem label="Locali" value={editedRecord.locali} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('locali', e.target.value)} />
            <EditableDetailItem label="Bagni" value={editedRecord.bagni} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('bagni', e.target.value)} />
            <EditableDetailItem label="Caratteristiche" value={(editedRecord.caratteristiche || []).join(', ')} isEditing={isEditing} onChange={(e) => handleInputChange('caratteristiche', e.target.value.split(',').map(s => s.trim()))} />
            <EditableDetailItem label="Proprietario" value={`${editedRecord.nome_proprietario || ''} ${editedRecord.cognome_proprietario || ''}`} isEditing={isEditing} onChange={(e) => { const [nome, ...cognome] = e.target.value.split(' '); handleInputChange('nome_proprietario', nome); handleInputChange('cognome_proprietario', cognome.join(' ')); }} />
            <EditableDetailItem label="Telefono Prop." value={editedRecord.telefono_proprietario} isEditing={isEditing} type="tel" onChange={(e) => handleInputChange('telefono_proprietario', e.target.value)} warningComponent={duplicateWarning} />
            <EditableDetailItem label="Secondo Telefono" value={editedRecord.phone_2} isEditing={isEditing} type="tel" placeholder="+39 XXX XXX XXXX" onChange={(e) => handleInputChange('phone_2', e.target.value)} />
            <EditableDetailItem label="Email Prop." value={editedRecord.email_proprietario} isEditing={isEditing} type="email" onChange={(e) => handleInputChange('email_proprietario', e.target.value)} />
            <EditableDetailItem label="Scadenza Mandato" value={isEditing ? (editedRecord.scadenza_mandato ? format(new Date(editedRecord.scadenza_mandato), 'yyyy-MM-dd') : '') : (editedRecord.scadenza_mandato ? format(new Date(editedRecord.scadenza_mandato), 'dd/MM/yyyy') : 'N/A')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('scadenza_mandato', e.target.value)} />
            <EditableDetailItem label="Data Richiamo" value={isEditing ? (editedRecord.data_richiamo ? format(new Date(editedRecord.data_richiamo), 'yyyy-MM-dd') : '') : (editedRecord.data_richiamo ? format(new Date(editedRecord.data_richiamo), 'dd/MM/yyyy') : 'N/A')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('data_richiamo', e.target.value)} />
            <EditableDetailItem label="Note" value={editedRecord.note} isEditing={isEditing} type="textarea" onChange={(e) => handleInputChange('note', e.target.value)} textareaProps={{ className: "h-20" }} />
          </>
        );
      case 'Potenziale Acquirente/Venditore':
        return (
          <>
            <EditableDetailItem label="Tipologia" value={editedRecord.type} isEditing={isEditing}>
                <Select value={editedRecord.type || 'acquirente'} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger className={!editedRecord.type ? "border-red-500 ring-red-500" : ""}>
                        <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                    <SelectContent>
                        <div className="max-h-48 overflow-y-auto">
                            <SelectItem value="acquirente">Acquirente</SelectItem>
                            <SelectItem value="venditore">Venditore</SelectItem>
                        </div>
                    </SelectContent>
                </Select>
            </EditableDetailItem>
            <EditableDetailItem label="Nome" value={editedRecord.nome} isEditing={isEditing} onChange={(e) => handleInputChange('nome', e.target.value)} />
            <EditableDetailItem label="Cognome" value={editedRecord.cognome} isEditing={isEditing} onChange={(e) => handleInputChange('cognome', e.target.value)} />
            <AgentSelector isEditing={isEditing} record={editedRecord} onChange={(value) => handleInputChange('agente_id', value)} agents={agents}/>
            <EditableDetailItem label="Stato" value={editedRecord.stato} isEditing={isEditing}>
                 <ConfigurableSelect fieldName="stato_attivita" value={editedRecord.stato} onChange={(value) => handleInputChange('stato', value)} />
            </EditableDetailItem>
            <AddressField isEditing={isEditing} record={editedRecord} onAddressSelect={handleAddressSelect} />
            <EditableDetailItem label="Città" value={editedRecord.citta} isEditing={isEditing} onChange={(e) => handleInputChange('citta', e.target.value)} />
            <EditableDetailItem 
                label="Telefono" 
                value={editedRecord.telefono} 
                isEditing={isEditing} 
                type="tel" 
                onChange={(e) => handleInputChange('telefono', e.target.value)} 
                warningComponent={duplicateWarning}
            />
            <EditableDetailItem label="Secondo Telefono" value={editedRecord.phone_2} isEditing={isEditing} type="tel" placeholder="+39 XXX XXX XXXX" onChange={(e) => handleInputChange('phone_2', e.target.value)} />
            <EditableDetailItem label="Email" value={editedRecord.email} isEditing={isEditing} type="email" onChange={(e) => handleInputChange('email', e.target.value)} />
            <EditableDetailItem label="Data Richiamo" value={isEditing ? (editedRecord.data_richiamo ? format(new Date(editedRecord.data_richiamo), 'yyyy-MM-dd') : '') : (editedRecord.data_richiamo ? format(new Date(editedRecord.data_richiamo), 'dd/MM/yyyy') : 'N/A')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('data_richiamo', e.target.value)} />
            {editedRecord.type === 'acquirente' && ( <EditableDetailItem label="Budget" value={isEditing ? editedRecord.budget : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(editedRecord.budget || 0)} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('budget', e.target.value)} />)}
            <EditableDetailItem label="Categoria" value={editedRecord.categoria} isEditing={isEditing}>
                 <ConfigurableSelect fieldName="categoria_attivita" value={editedRecord.categoria} onChange={(value) => handleInputChange('categoria', value)} />
            </EditableDetailItem>
            <EditableDetailItem label="Note" value={editedRecord.note} isEditing={isEditing} type="textarea" onChange={(e) => handleInputChange('note', e.target.value)} textareaProps={{ className: "h-20" }} />
          </>
        );
      case 'Potenziale Tabaccheria':
        return (
          <>
            <EditableDetailItem label="Nome" value={editedRecord.nome} isEditing={isEditing} onChange={(e) => handleInputChange('nome', e.target.value)} />
            <EditableDetailItem label="Cognome" value={editedRecord.cognome} isEditing={isEditing} onChange={(e) => handleInputChange('cognome', e.target.value)} />
            <AgentSelector isEditing={isEditing} record={editedRecord} onChange={(value) => handleInputChange('agente_id', value)} agents={agents}/>
            <AddressField isEditing={isEditing} record={editedRecord} onAddressSelect={handleAddressSelect} />
            <EditableDetailItem label="Città" value={editedRecord.citta} isEditing={isEditing} onChange={(e) => handleInputChange('citta', e.target.value)} />
            <EditableDetailItem label="Regione" value={editedRecord.regione} isEditing={isEditing} onChange={(e) => handleInputChange('regione', e.target.value)} />
            <EditableDetailItem label="Categoria" value={editedRecord.categoria} isEditing={isEditing}>
                 <ConfigurableSelect fieldName="categoria_attivita" value={editedRecord.categoria} onChange={(value) => handleInputChange('categoria', value)} />
            </EditableDetailItem>
            <EditableDetailItem label="Numero Rivendita" value={editedRecord.numero_rivendita} isEditing={isEditing} type="number" onChange={(e) => handleInputChange('numero_rivendita', e.target.value)} />
            <EditableDetailItem label="Numero Ricevitoria" value={editedRecord.numero_ricevitoria} isEditing={isEditing} onChange={(e) => handleInputChange('numero_ricevitoria', e.target.value)} />
            <EditableDetailItem label="Tipo Rivendita" value={editedRecord.tipo_rivendita} isEditing={isEditing} onChange={(e) => handleInputChange('tipo_rivendita', e.target.value)} />
            <EditableDetailItem label="Distributore" value={editedRecord.distributore} isEditing={isEditing}>
                 <ConfigurableSelect fieldName="distributore_tabaccheria" value={editedRecord.distributore} onChange={(value) => handleInputChange('distributore', value)} />
            </EditableDetailItem>
            <EditableDetailItem label="Stato" value={editedRecord.stato} isEditing={isEditing}>
                 <ConfigurableSelect fieldName="stato_attivita" value={editedRecord.stato} onChange={(value) => handleInputChange('stato', value)} />
            </EditableDetailItem>
            <EditableDetailItem 
                label="Telefono" 
                value={editedRecord.telefono} 
                isEditing={isEditing} 
                type="tel" 
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                warningComponent={duplicateWarning}
            />
            <EditableDetailItem label="Secondo Telefono" value={editedRecord.phone_2} isEditing={isEditing} type="tel" placeholder="+39 XXX XXX XXXX" onChange={(e) => handleInputChange('phone_2', e.target.value)} />
            <EditableDetailItem label="Email" value={editedRecord.email} isEditing={isEditing} type="email" onChange={(e) => handleInputChange('email', e.target.value)} />
            <EditableDetailItem label="Presa in Carico" value={isEditing ? (editedRecord.data_presa_in_carico ? format(new Date(editedRecord.data_presa_in_carico), 'yyyy-MM-dd') : '') : (editedRecord.data_presa_in_carico ? format(new Date(editedRecord.data_presa_in_carico), 'dd/MM/yyyy') : 'N/A')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('data_presa_in_carico', e.target.value)} />
            <EditableDetailItem label="Data Richiamo" value={isEditing ? (editedRecord.data_ultimo_richiamo ? format(new Date(editedRecord.data_ultimo_richiamo), 'yyyy-MM-dd') : '') : (editedRecord.data_ultimo_richiamo ? format(new Date(editedRecord.data_ultimo_richiamo), 'dd/MM/yyyy') : 'N/A')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('data_ultimo_richiamo', e.target.value)} />
            <EditableDetailItem label="Note" value={editedRecord.note} isEditing={isEditing} type="textarea" onChange={(e) => handleInputChange('note', e.target.value)} textareaProps={{ className: "h-20" }} />
          </>
        );
      case 'Telemarketing':
        return (
          <>
            <EditableDetailItem label="Tipologia" value={editedRecord.anagrafica_type} isEditing={isEditing}> <Select value={editedRecord.anagrafica_type} onValueChange={(value) => handleInputChange('anagrafica_type', value)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent><div className="max-h-48 overflow-y-auto"> <SelectItem value="AZIENDA">Azienda</SelectItem> <SelectItem value="PRIVATO">Privato</SelectItem> </div></SelectContent> </Select> </EditableDetailItem>
            {editedRecord.anagrafica_type === 'AZIENDA' && ( <EditableDetailItem label="Azienda" value={editedRecord.nome_azienda} isEditing={isEditing} onChange={(e) => handleInputChange('nome_azienda', e.target.value)} /> )}
            <EditableDetailItem label="Nome" value={editedRecord.nome} isEditing={isEditing} onChange={(e) => handleInputChange('nome', e.target.value)} />
            <EditableDetailItem label="Cognome" value={editedRecord.cognome} isEditing={isEditing} onChange={(e) => handleInputChange('cognome', e.target.value)} />
            <AgentSelector label="Agente Associato" isEditing={isEditing} record={editedRecord} onChange={(value) => handleInputChange('agente_id', value)} agents={agents.filter(a => a.role !== 'telemarketing')} />
            <AddressField isEditing={isEditing} record={editedRecord} onAddressSelect={handleAddressSelect} />
            <EditableDetailItem label="Città" value={editedRecord.citta} isEditing={isEditing} onChange={(e) => handleInputChange('citta', e.target.value)} />
            <EditableDetailItem label="Regione" value={editedRecord.regione} isEditing={isEditing} onChange={(e) => handleInputChange('regione', e.target.value)} />
            <EditableDetailItem label="Telefono" value={editedRecord.telefono} isEditing={isEditing} type="tel" onChange={(e) => handleInputChange('telefono', e.target.value)} warningComponent={duplicateWarning} />
            <EditableDetailItem label="Secondo Telefono" value={editedRecord.phone_2} isEditing={isEditing} type="tel" placeholder="+39 XXX XXX XXXX" onChange={(e) => handleInputChange('phone_2', e.target.value)} />
            <EditableDetailItem label="Email" value={editedRecord.email} isEditing={isEditing} type="email" onChange={(e) => handleInputChange('email', e.target.value)} />
            <EditableDetailItem label="Categoria" value={editedRecord.categoria} isEditing={isEditing}>
                <ConfigurableSelect fieldName="categoria_attivita" value={editedRecord.categoria} onChange={(value) => handleInputChange('categoria', value)} />
            </EditableDetailItem>
            <EditableDetailItem label="Stato" value={editedRecord.stato} isEditing={isEditing}>
                <ConfigurableSelect fieldName="stato_attivita" value={editedRecord.stato} onChange={(value) => handleInputChange('stato', value)} />
            </EditableDetailItem>
            <EditableDetailItem label="Data Richiamo" value={isEditing ? (editedRecord.data_ultimo_richiamo ? format(new Date(editedRecord.data_ultimo_richiamo), 'yyyy-MM-dd') : '') : (editedRecord.data_ultimo_richiamo ? format(new Date(editedRecord.data_ultimo_richiamo), 'dd/MM/yyyy') : 'N/A')} isEditing={isEditing} type="date" onChange={(e) => handleInputChange('data_ultimo_richiamo', e.target.value)} />
            <EditableDetailItem label="Note" value={editedRecord.note} isEditing={isEditing} type="textarea" onChange={(e) => handleInputChange('note', e.target.value)} textareaProps={{ rows: 2, className: "min-h-0" }} />
          </>
        );
      case 'Appuntamento':
        return (
            <>
                <EditableDetailItem label="Titolo" value={editedRecord.title} isEditing={isEditing} onChange={(e) => handleInputChange('title', e.target.value)} />
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 pt-4">Le date non sono modificabili da qui.</p>
            </>
        );
      default:
        return <p>Nessun dettaglio disponibile per il tipo: {record.recordType}</p>;
    }
  };

  const renderLinksSection = () => {
      const urls = Array.isArray(editedRecord.allegati_urls) ? editedRecord.allegati_urls : [];
      return (
          <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-gray-500" /> Link Allegati (Google Drive, Dropbox, ecc.)
              </h3>
              {isEditing && (
                  <div className="flex gap-2">
                      <Input 
                          placeholder="https://drive.google.com/..." 
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                      />
                      <Button type="button" onClick={handleAddUrl} disabled={!newUrl.trim()}>
                          <Plus className="h-4 w-4 mr-1" /> Aggiungi
                      </Button>
                  </div>
              )}
              <div className="mt-4 space-y-2">
                  {urls.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nessun link allegato.</p>
                  ) : (
                      <ul className="space-y-2">
                          {urls.map((url, index) => (
                              <li key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                                  <a 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-sm text-blue-600 hover:underline truncate max-w-[80%] flex items-center gap-2"
                                  >
                                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                      {url}
                                  </a>
                                  {isEditing && (
                                      <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                          onClick={() => handleRemoveUrl(index)}
                                      >
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  )}
                              </li>
                          ))}
                      </ul>
                  )}
              </div>
          </div>
      );
  };

  const getDialogTitle = () => {
    if (!record || !record.recordType) return "Dettaglio";
    const action = isEditing ? (isAdding ? 'Aggiungi' : 'Modifica') : 'Dettaglio';
    const type = record.recordType;
    let finalTitle = `${action} ${type}`;
    if (type === 'Potenziale Acquirente/Venditore' && editedRecord.type) { finalTitle += ` (${editedRecord.type.charAt(0).toUpperCase() + editedRecord.type.slice(1)})`; }
    if (type === 'Telemarketing' && editedRecord.anagrafica_type) { finalTitle += ` (${editedRecord.anagrafica_type.charAt(0).toUpperCase() + editedRecord.anagrafica_type.slice(1).toLowerCase()})`; }
    return finalTitle;
  }
  
  const getDialogDescription = () => {
      if (!record || !editedRecord) return '';
      if (record.recordType === 'Telemarketing') {
          const assignedAgent = agents.find(a => a.id === editedRecord.agente_id);
          return assignedAgent ? `Assegnato a: ${assignedAgent.name}` : 'Non ancora assegnato a un agente.';
      }
      const managingAgent = agents.find(a => a.id === editedRecord.agente_id);
      return `Gestito da: ${managingAgent?.name || 'N/A'}`;
  }

  const oldAgentName = agents.find(a => a.id === initialRecord?.agente_id)?.name || 'Nessuno';
  const newAgentName = agents.find(a => a.id === editedRecord?.agente_id)?.name || 'Nessuno';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleClose(); } }}>
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl !z-[1500]" style={{ zIndex: 1500 }}>
        <DialogHeader>
          <div className="flex items-center gap-2">
              <DialogTitle>{getDialogTitle()}</DialogTitle>
              {hasUnsavedChanges && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                    Modifiche non salvate
                </span>
              )}
          </div>
          <DialogDescription> <span className="font-semibold">{getDialogDescription()}</span> </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Dettagli</TabsTrigger>
                <TabsTrigger value="links">Link Allegati</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
                    {renderRecordDetails()}
                </div>
            </TabsContent>
            <TabsContent value="links" className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
                {renderLinksSection()}
            </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-between pt-4">
            {isEditing ? (
                <div className="flex w-full justify-between items-center">
                    {!isAdding && canEditRecord && (
                        <Button 
                            variant="destructive" 
                            onClick={() => setIsDeleteAlertOpen(true)} 
                            disabled={isSaving}
                            className="mr-auto"
                        >
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina
                        </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <Button variant="outline" onClick={handleCancel} disabled={isSaving}> 
                            <X className="h-4 w-4 mr-2" /> Annulla 
                        </Button>
                        {record.recordType === 'Telemarketing' && (
                            <Button variant="secondary" onClick={handleAssign} disabled={!editedRecord.agente_id || isSaving}>
                                <UserPlus className="h-4 w-4 mr-2" /> Assegna ad Agente
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={isSaving} className={hasUnsavedChanges ? "ring-2 ring-offset-2 ring-blue-500" : ""}> 
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salva 
                        </Button>
                    </div>
                </div>
            ) : (
                 <div className="flex w-full justify-end gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary" onClick={handleClose}>Chiudi</Button>
                    </DialogClose>
                    {canEditRecord && (
                        <Button onClick={() => setIsEditing(true)}> <Pencil className="h-4 w-4 mr-2" /> Modifica </Button>
                    )}
                </div>
            )}
        </DialogFooter>
      </DialogContent>

       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent style={{ zIndex: 1600 }}> 
                <AlertDialogHeader>
                    <AlertDialogTitle>Elimina Record</AlertDialogTitle>
                    <AlertDialogDescription>
                        Sei sicuro di voler eliminare questo record? Questa azione è irreversibile e cancellerà definitivamente tutti i dati associati.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Elimina"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isConfigAlertOpen} onOpenChange={(open) => { if(!open) setIsConfigAlertOpen(false); }}>
            <AlertDialogContent style={{ zIndex: 1700 }}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Nuova Configurazione</AlertDialogTitle>
                    <AlertDialogDescription>
                        La voce <strong>"{pendingConfigField?.missingValue}"</strong> non esiste in <strong>{pendingConfigField?.missingField}</strong>.
                        <br /><br />
                        Vuoi aggiungerla alle opzioni disponibili per il futuro?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsConfigAlertOpen(false)}>Annulla Salvataggio</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmAndAddOption}>Sì, Aggiungi e Salva</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

       {record.recordType === 'Telemarketing' && isAssignModalOpen && (
            <AssignAgentModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                contact={editedRecord}
                agentId={editedRecord.agente_id}
                onAssignmentComplete={handleAssignmentComplete}
            />
        )}

       <DuplicatePhoneModal 
           isOpen={showDuplicateModal}
           duplicateRecord={duplicateRecord}
           onCancel={() => setShowDuplicateModal(false)}
           onConfirmUpdate={(recordId) => {
               setShowDuplicateModal(false);
               if (onSwitchToRecord) {
                   onSwitchToRecord(recordId);
               } else {
                   toast({ title: "Feature not implemented", description: "Parent component must handle redirect.", variant: "destructive" });
               }
           }}
       />
    </Dialog>

    <ConfirmChangeAgentModal
        isOpen={isConfirmAgentModalOpen}
        onCancel={() => setIsConfirmAgentModalOpen(false)}
        onConfirm={async () => {
            setIsConfirmAgentModalOpen(false);
            await proceedWithSave();
        }}
        oldAgentName={oldAgentName}
        newAgentName={newAgentName}
    />
    </>
  );
});

export default RecordDetailModal;
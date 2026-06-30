import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormDraftManager } from '@/hooks/useFormDraftManager';

const CreatePotentialModal = ({ isOpen, onClose, contact }) => {
    const { addRecord, updateRecord, fetchAllData, configurations } = useData();
    const { user } = useAuth();
    const { toast } = useToast();
    
    // Define draft key
    const DRAFT_KEY = `draft_create_potential_${user?.id}`;
    const { draft, saveDraftField, clearDraft } = useFormDraftManager(DRAFT_KEY);

    // Form State
    const [potentialType, setPotentialType] = useState('potential_activities');
    const [activityType, setActivityType] = useState('acquirente'); 
    const [nome, setNome] = useState('');
    const [cognome, setCognome] = useState('');
    const [stato, setStato] = useState('ATTIVO');
    const [indirizzo, setIndirizzo] = useState('');
    const [citta, setCitta] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [dataRichiamo, setDataRichiamo] = useState('');
    const [categoria, setCategoria] = useState('');
    const [note, setNote] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Categories for selection
    const categorieOptions = configurations.filter(c => c.type === 'categoria_attivita').map(c => c.value);

    // Initialize form when contact prop changes OR draft loads
    useEffect(() => {
        if (isOpen) {
            if (draft) {
                // Prioritize Draft if exists
                setPotentialType(draft.potentialType || 'potential_activities');
                setActivityType(draft.activityType || 'acquirente');
                setNome(draft.nome || (contact?.nome || ''));
                setCognome(draft.cognome || (contact?.cognome || ''));
                setTelefono(draft.telefono || (contact?.telefono || ''));
                setEmail(draft.email || (contact?.email || ''));
                setIndirizzo(draft.indirizzo || (contact?.indirizzo || ''));
                setCitta(draft.citta || (contact?.citta || ''));
                setCategoria(draft.categoria || (contact?.categoria || ''));
                setNote(draft.note || (contact?.note || ''));
                setStato(draft.stato || 'ATTIVO');
                setDataRichiamo(draft.dataRichiamo || '');
                
                if(!contact) {
                    toast({
                        title: "Bozza Ripristinata",
                        description: "I dati non salvati sono stati recuperati.",
                        className: "bg-blue-50 border-blue-200"
                    });
                }
            } else if (contact) {
                // Fallback to Contact Data
                setNome(contact.nome || '');
                setCognome(contact.cognome || '');
                setTelefono(contact.telefono || '');
                setEmail(contact.email || '');
                setIndirizzo(contact.indirizzo || '');
                setCitta(contact.citta || '');
                setCategoria(contact.categoria || '');
                setNote(contact.note || '');
                setStato('ATTIVO');
                setDataRichiamo('');
                setActivityType('acquirente');
            }
            setErrors({});
        }
    }, [contact, isOpen, draft, toast]);

    const handleFieldChange = (field, value) => {
        switch(field) {
            case 'potentialType': setPotentialType(value); break;
            case 'activityType': setActivityType(value); break;
            case 'nome': setNome(value); break;
            case 'cognome': setCognome(value); break;
            case 'stato': setStato(value); break;
            case 'indirizzo': setIndirizzo(value); break;
            case 'citta': setCitta(value); break;
            case 'telefono': setTelefono(value); break;
            case 'email': setEmail(value); break;
            case 'dataRichiamo': setDataRichiamo(value); break;
            case 'categoria': setCategoria(value); break;
            case 'note': setNote(value); break;
        }
        saveDraftField(field, value);
    };

    const handleCancel = () => {
        clearDraft();
        onClose();
    };

    const validateForm = () => {
        const newErrors = {};
        if (!nome) newErrors.nome = true;
        if (!cognome) newErrors.cognome = true;
        if (!stato) newErrors.stato = true;
        if (!telefono) newErrors.telefono = true;
        
        if (potentialType === 'potential_activities' && !activityType) {
            newErrors.activityType = true;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast({ 
                title: "Campi obbligatori mancanti", 
                description: "Compila tutti i campi obbligatori evidenziati in rosso.", 
                variant: "destructive" 
            });
            return;
        }

        setIsSubmitting(true);
        
        const formData = {
            type: potentialType === 'potential_activities' ? activityType : null,
            nome,
            cognome,
            agente_id: user?.id,
            stato,
            indirizzo,
            citta,
            telefono,
            email,
            data_richiamo: dataRichiamo || null,
            categoria,
            note,
        };

        if (potentialType === 'potential_activities' && !formData.type) {
             toast({ 
                title: "Errore Critico", 
                description: "La tipologia è obbligatoria per le Attività.", 
                variant: "destructive" 
            });
            setIsSubmitting(false);
            return;
        }

        try {
            let tableName = potentialType;
            let recordType = 'Potenziale Attività';
            
            if (potentialType === 'potential_tobacconists') {
                tableName = 'potential_tobacconists';
                recordType = 'Potenziale Tabaccheria';
                delete formData.type;
            }

            const { data: newPotential, error } = await supabase
                .from(tableName)
                .insert(formData)
                .select()
                .single();

            if (error) throw error;

            addRecord(tableName, newPotential, recordType);

            if (contact?.id) {
                const { data: updatedContact, error: updateError } = await supabase
                    .from('telemarketing_contacts')
                    .update({ agente_id: user?.id, stato: 'Convertito' })
                    .eq('id', contact.id)
                    .select()
                    .single();
                
                if (!updateError) {
                    updateRecord('telemarketing_contacts', updatedContact);
                }
            }

            toast({ 
                title: "Record creato con successo", 
                description: <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500"/> Il potenziale è stato salvato.</div>,
                className: "bg-green-50 border-green-200"
            });
            
            clearDraft(); // Clear draft on success
            fetchAllData(); 
            onClose();

        } catch (error) {
            console.error("Errore Creazione:", error);
            toast({ 
                title: "Errore nel salvataggio", 
                description: <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {error.message}</div>, 
                variant: "destructive" 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuovo Potenziale</DialogTitle>
                    <DialogDescription>
                        Inserisci i dettagli del nuovo potenziale. I campi contrassegnati con * sono obbligatori.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo Record</Label>
                            <Select value={potentialType} onValueChange={(val) => handleFieldChange('potentialType', val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="potential_activities">Attività</SelectItem>
                                    <SelectItem value="potential_tobacconists">Tabaccheria</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label className={cn(errors.activityType && "text-red-500")}>Tipologia *</Label>
                             {potentialType === 'potential_activities' ? (
                                <Select value={activityType} onValueChange={(val) => handleFieldChange('activityType', val)}>
                                    <SelectTrigger className={cn(errors.activityType && "border-red-500 ring-red-500")}>
                                        <SelectValue placeholder="Seleziona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="venditore">Venditore</SelectItem>
                                        <SelectItem value="acquirente">Acquirente</SelectItem>
                                    </SelectContent>
                                </Select>
                             ) : (
                                <Input value="Tabaccheria" disabled />
                             )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className={cn(errors.nome && "text-red-500")}>Nome *</Label>
                            <Input 
                                value={nome} 
                                onChange={e => handleFieldChange('nome', e.target.value)} 
                                placeholder="Es. Mario" 
                                className={cn(errors.nome && "border-red-500")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className={cn(errors.cognome && "text-red-500")}>Cognome *</Label>
                            <Input 
                                value={cognome} 
                                onChange={e => handleFieldChange('cognome', e.target.value)} 
                                placeholder="Es. Rossi" 
                                className={cn(errors.cognome && "border-red-500")}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Agente (Tu)</Label>
                            <Input value={user?.user_metadata?.name || user?.email || 'Utente Corrente'} disabled className="bg-gray-100 text-gray-600" />
                        </div>
                        <div className="space-y-2">
                            <Label className={cn(errors.stato && "text-red-500")}>Stato *</Label>
                            <Input 
                                value={stato} 
                                onChange={e => handleFieldChange('stato', e.target.value)} 
                                className={cn(errors.stato && "border-red-500")}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label className={cn(errors.telefono && "text-red-500")}>Telefono *</Label>
                            <Input 
                                value={telefono} 
                                onChange={e => handleFieldChange('telefono', e.target.value)} 
                                placeholder="Es. 3331234567" 
                                className={cn(errors.telefono && "border-red-500")}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={email} onChange={e => handleFieldChange('email', e.target.value)} type="email" placeholder="email@esempio.com" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Indirizzo</Label>
                            <Input value={indirizzo} onChange={e => handleFieldChange('indirizzo', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Città</Label>
                            <Input value={citta} onChange={e => handleFieldChange('citta', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={categoria} onValueChange={(val) => handleFieldChange('categoria', val)}>
                                <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                                <SelectContent>
                                    {categorieOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Data Richiamo</Label>
                            <Input type="date" value={dataRichiamo} onChange={e => handleFieldChange('dataRichiamo', e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Note</Label>
                        <Textarea value={note} onChange={e => handleFieldChange('note', e.target.value)} rows={3} placeholder="Note aggiuntive..." />
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>Annulla</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio...</>
                            ) : (
                                'Crea Potenziale'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreatePotentialModal;
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { useFormDraftManager } from '@/hooks/useFormDraftManager';

const AssignAgentModal = ({ isOpen, onClose, contact, agentId, onAssignmentComplete }) => {
    const { addRecord, updateRecord } = useData();
    const { toast } = useToast();
    
    // Draft Manager
    const DRAFT_KEY = `draft_assign_agent_${contact?.id}`;
    const { draft, saveDraftField, clearDraft } = useFormDraftManager(DRAFT_KEY);

    const [potentialType, setPotentialType] = useState('potential_activities');
    const [activityType, setActivityType] = useState('venditore');
    const [recallDate, setRecallDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    const [notes, setNotes] = useState(contact.note || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Restore draft
    useEffect(() => {
        if (isOpen && draft) {
            if (draft.potentialType) setPotentialType(draft.potentialType);
            if (draft.activityType) setActivityType(draft.activityType);
            if (draft.recallDate) setRecallDate(draft.recallDate);
            if (draft.notes) setNotes(draft.notes);
            
            toast({
                title: "Bozza recuperata",
                description: "Stai riprendendo un'assegnazione interrotta.",
                className: "bg-blue-50 border-blue-200"
            });
        }
    }, [isOpen, draft, toast]);

    const handleFieldChange = (field, value) => {
        switch(field) {
            case 'potentialType': setPotentialType(value); break;
            case 'activityType': setActivityType(value); break;
            case 'recallDate': setRecallDate(value); break;
            case 'notes': setNotes(value); break;
        }
        saveDraftField(field, value);
    };

    const handleClose = () => {
        clearDraft();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!agentId || !recallDate) {
            toast({ title: "Campi mancanti", description: "Imposta una data di richiamo.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        /* --- DEBUG LOGGING INIZIALE --- */
        console.log("=== INIZIO TRASFERIMENTO ASSEGNAZIONE ===");
        console.log("Contatto Telemarketing Originale:", contact);
        console.log("Valore estratto di 'allegati_urls' dal contatto:", contact.allegati_urls);
        console.log("Tipo di dato 'allegati_urls':", typeof contact.allegati_urls);

        // Sanificazione del campo allegati_urls
        let parsedAllegati = contact.allegati_urls;
        if (typeof parsedAllegati === 'string' && parsedAllegati.trim().startsWith('[')) {
            try {
                parsedAllegati = JSON.parse(parsedAllegati);
                console.log("Il campo era una stringa JSON. Parsato con successo:", parsedAllegati);
            } catch (err) {
                console.warn("Impossibile parsare allegati_urls come JSON array:", err);
            }
        } else if (typeof parsedAllegati === 'string') {
            // Se è una semplice stringa (es. un singolo link copiato e incollato senza array)
            // lo convertiamo in un array per mantenere la coerenza del formato JSONB 
            if (parsedAllegati.trim() !== '') {
                parsedAllegati = [parsedAllegati.trim()];
                console.log("Il campo era una stringa semplice. Convertito in array:", parsedAllegati);
            } else {
                parsedAllegati = null;
            }
        }
        
        console.log("Valore definitivo di 'allegati_urls' da trasferire:", parsedAllegati);
        /* --- FINE DEBUG LOGGING INIZIALE --- */

        let potentialData = {
            agente_id: agentId,
            note: notes,
            allegati_urls: parsedAllegati || null, // Include links/attachments from source safely
            phone_2: contact.phone_2 || null, // Also include secondary phone if present
        };

        let tableName = potentialType;
        let recordType = '';

        if (potentialType === 'potential_activities') {
            potentialData = {
                ...potentialData,
                nome: contact.nome,
                cognome: contact.cognome,
                telefono: contact.telefono,
                email: contact.email,
                indirizzo: contact.indirizzo,
                citta: contact.citta,
                regione: contact.regione,
                lat: contact.lat,
                lng: contact.lng,
                type: activityType,
                categoria: contact.categoria,
                data_richiamo: recallDate,
            };
            tableName = 'potential_activities';
            recordType = 'Potenziale Attività';
        } else if (potentialType === 'potential_tobacconists') {
            potentialData = {
                ...potentialData,
                nome: contact.nome,
                cognome: contact.cognome,
                telefono: contact.telefono,
                email: contact.email,
                indirizzo: contact.indirizzo,
                citta: contact.citta,
                regione: contact.regione,
                lat: contact.lat,
                lng: contact.lng,
                categoria: 'Tabaccheria', 
                data_ultimo_richiamo: recallDate,
            };
            tableName = 'potential_tobacconists';
            recordType = 'Potenziale Tabaccheria';
        } else if (potentialType === 'properties') {
            potentialData = {
                ...potentialData,
                nome_proprietario: contact.nome,
                cognome_proprietario: contact.cognome,
                telefono_proprietario: contact.telefono,
                email_proprietario: contact.email,
                indirizzo: contact.indirizzo,
                citta: contact.citta,
                regione: contact.regione,
                lat: contact.lat,
                lng: contact.lng,
                data_richiamo: recallDate,
                codice: 'IMM', 
                numero: Math.floor(1000 + Math.random() * 9000), 
                categoria: 'Residenziale', 
                tipologia: 'Appartamento',
                stato: 'Disponibile', 
                prezzo: 0,
                mq: 0,
                locali: 0,
                bagni: 0,
                caratteristiche: [],
                scadenza_mandato: null,
            };
            tableName = 'properties';
            recordType = 'Immobile';
        }
        
        console.log(`Dati finali in fase di inserimento in '${tableName}':`, potentialData);

        const { data: newPotential, error: potentialError } = await supabase
            .from(tableName)
            .insert(potentialData)
            .select()
            .single();

        if (potentialError) {
            console.error(`Errore durante l'inserimento in ${tableName}:`, potentialError);
            toast({ title: "Errore Creazione Potenziale", description: potentialError.message, variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        console.log(`Record potenziale creato con successo in '${tableName}':`, newPotential);
        addRecord(tableName, newPotential, recordType);

        const { data: updatedContact, error: updateContactError } = await supabase
            .from('telemarketing_contacts')
            .update({ agente_id: agentId, stato: 'Assegnato' })
            .eq('id', contact.id)
            .select()
            .single();

        if (updateContactError) {
            console.error("Errore durante l'aggiornamento del contatto telemarketing:", updateContactError);
            toast({ title: "Errore Aggiornamento Contatto TMK", description: updateContactError.message, variant: "destructive" });
        } else {
            console.log("Contatto telemarketing aggiornato con successo:", updatedContact);
            updateRecord('telemarketing_contacts', updatedContact);
        }

        toast({ title: "Successo!", description: "Contatto assegnato e potenziale creato." });
        console.log("=== FINE TRASFERIMENTO ASSEGNAZIONE ===");
        
        clearDraft(); // Clear draft on success
        setIsSubmitting(false);
        if (onAssignmentComplete) {
            onAssignmentComplete(updatedContact); 
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[525px] z-[2001]">
                <DialogHeader>
                    <DialogTitle>Assegna Contatto e Crea Potenziale</DialogTitle>
                    <DialogDescription>
                        Stai assegnando "{contact?.anagrafica_type === 'AZIENDA' ? contact?.nome_azienda : `${contact?.nome || ''} ${contact?.cognome || ''}`}". Seleziona dove creare il nuovo potenziale.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="potential-type" className="text-right">Crea in</Label>
                        <Select value={potentialType} onValueChange={(val) => handleFieldChange('potentialType', val)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleziona tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="potential_activities">Potenziali Attività</SelectItem>
                                <SelectItem value="potential_tobacconists">Potenziali Tabaccherie</SelectItem>
                                <SelectItem value="properties">Immobili</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {potentialType === 'potential_activities' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="activity-type" className="text-right">Tipologia</Label>
                            <Select value={activityType} onValueChange={(val) => handleFieldChange('activityType', val)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleziona tipologia" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="venditore">Venditore</SelectItem>
                                    <SelectItem value="acquirente">Acquirente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="recall-date" className="text-right">Data Richiamo</Label>
                        <Input id="recall-date" type="date" value={recallDate} onChange={e => handleFieldChange('recallDate', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">Note</Label>
                        <Textarea id="notes" value={notes} onChange={e => handleFieldChange('notes', e.target.value)} className="col-span-3" />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={handleClose}>Annulla</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Conferma Assegnazione
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AssignAgentModal;
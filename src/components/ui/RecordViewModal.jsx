import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isValid, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const RecordViewModal = ({ isOpen, onClose, record, tableName }) => {
    // Safety check for record
    if (!record) return null;

    const ignoredFields = ['id', 'created_at', 'updated_at', 'search_vector', 'is_master_record'];
    
    // Safety filter for null/undefined fields
    const fields = Object.entries(record)
        .filter(([key, val]) => !ignoredFields.includes(key) && val !== null && val !== undefined && val !== '')
        .sort((a, b) => {
            // Keep phone and phone_2 together if possible, though sorting alphabetically does this well enough
            return a[0].localeCompare(b[0]);
        });

    const formatValue = (key, value) => {
        try {
            if (typeof value === 'boolean') return value ? 'Sì' : 'No';
            if (typeof value === 'object') return JSON.stringify(value);
            
            // Format phone fields as clickable links
            if (['telefono', 'telefono_proprietario', 'phone_2'].includes(key)) {
                return (
                    <a href={`tel:${value}`} className="text-blue-600 hover:underline hover:text-blue-800">
                        {value}
                    </a>
                );
            }

            // Special handling for Last Contact Date fields
            if (key === 'data_ultimo_richiamo' || key === 'data_richiamo') {
                if (!value) return "Mai richiamato";
                const date = typeof value === 'string' ? parseISO(value) : new Date(value);
                if (isValid(date)) {
                     // Check if it's a pure date (YYYY-MM-DD) or has time
                     const hasTime = value.includes('T') || value.includes(' ');
                     const formatStr = hasTime ? "dd MMM yyyy - HH:mm" : "dd MMM yyyy"; 
                     return format(date, formatStr, { locale: it });
                }
                return value;
            }

            // Check for other date-like keys
            if (
                (key.includes('data') || key.includes('date') || key.includes('_at') || key.includes('scadenza')) && 
                typeof value === 'string' && 
                !isNaN(Date.parse(value)) &&
                // Avoid formatting things that look like dates but might be simple strings or numbers if strictly numeric
                !/^\d+$/.test(value)
            ) {
                 const date = parseISO(value);
                 if (isValid(date)) {
                    return format(date, 'dd MMM yyyy', { locale: it });
                 }
            }
            return value;
        } catch (e) {
            console.warn("Error formatting value in RecordViewModal:", e);
            return String(value);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Dettaglio Record</DialogTitle>
                    <DialogDescription className="font-mono text-xs text-muted-foreground">
                        ID: {record.id}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        {fields.length > 0 ? (
                            fields.map(([key, value]) => (
                                <div key={key} className="flex flex-col space-y-1 p-2 bg-slate-50 rounded border border-slate-100">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        {key.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-sm font-medium text-slate-900 break-words">
                                        {formatValue(key, value)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="col-span-2 text-center text-muted-foreground py-4">
                                Nessun dato visualizzabile per questo record.
                            </p>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose}>Chiudi</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RecordViewModal;
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Eye, CheckCircle, Trash2, RefreshCw, XCircle, CalendarClock, Info, ShieldAlert } from 'lucide-react';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { checkDependencies } from '@/utils/duplicateManagementService';
import RecordViewModal from '@/components/ui/RecordViewModal';
import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useToast } from "@/components/ui/use-toast";

// Internal Error Boundary Component
class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DuplicatesManagementModal caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">Qualcosa è andato storto</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            Si è verificato un errore imprevisto durante il caricamento dei duplicati.
            <br/>
            <span className="font-mono text-xs bg-slate-100 p-1 rounded mt-2 inline-block">
                {this.state.error?.message || 'Errore sconosciuto'}
            </span>
          </p>
          <Button onClick={() => { this.setState({ hasError: false }); this.props.onRetry(); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Riprova
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const DuplicatesManagementModal = ({ isOpen, onClose, tableName, keyField, onComplete }) => {
    const shouldFetch = isOpen && !!tableName && !!keyField;
    const { groups, loading, error, findDuplicates, resolveGroup } = useDuplicateDetection(tableName, keyField);
    const { toast } = useToast();
    
    const [selectedMasters, setSelectedMasters] = useState({});
    const [viewRecord, setViewRecord] = useState(null);
    const [stats, setStats] = useState({ resolved: 0, deleted: 0 });
    
    // Dependency Confirmation State
    const [confirmingGroup, setConfirmingGroup] = useState(null);
    const [confirmingAll, setConfirmingAll] = useState(false);
    const [dependencyStats, setDependencyStats] = useState(null);
    const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        if (shouldFetch) {
            findDuplicates();
            setStats({ resolved: 0, deleted: 0 });
            setSelectedMasters({});
        }
    }, [shouldFetch, findDuplicates]);

    // Helper to get contact date safely
    const getContactDate = (record) => {
        return record.data_ultimo_richiamo || record.data_richiamo || null;
    };

    // Helper to get date object for sorting
    const getDateValue = (dateStr) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    // Memoize processed groups: sorted by criteria
    const processedGroups = useMemo(() => {
        if (!groups) return [];
        
        return groups.map(group => {
            const records = [...group.records].sort((a, b) => {
                // Primary Sort: Last Contact Date (Descending)
                const dateA = getDateValue(getContactDate(a));
                const dateB = getDateValue(getContactDate(b));
                if (dateB !== dateA) return dateB - dateA;

                // Secondary Sort: Updated At (Descending)
                const updateA = getDateValue(a.updated_at);
                const updateB = getDateValue(b.updated_at);
                return updateB - updateA;
            });

            return {
                ...group,
                records
            };
        });
    }, [groups]);

    // Auto-selection Logic
    useEffect(() => {
        if (processedGroups && processedGroups.length > 0) {
            const newSelections = {};
            
            processedGroups.forEach(group => {
                if (group.records && group.records.length > 0) {
                    newSelections[group.key] = group.records[0].id;
                }
            });
            setSelectedMasters(newSelections);
        }
    }, [processedGroups]);

    // --- Dependency Checking Logic ---

    const checkGroupDependencies = async (group) => {
        const masterId = selectedMasters[group.key];
        if (!masterId) return null;
        
        const idsToDelete = group.records
            .filter(r => r.id !== masterId)
            .map(r => r.id);
            
        if (idsToDelete.length === 0) return null;
        
        try {
            return await checkDependencies(tableName, idsToDelete);
        } catch (err) {
            console.error("Dependency check failed:", err);
            return null; // Fail safe, assume 0 or handle error
        }
    };

    const initiateSingleResolve = async (group) => {
        setConfirmingGroup(group);
        setConfirmingAll(false);
        setIsCheckingDependencies(true);
        setDependencyStats(null);

        try {
            const deps = await checkGroupDependencies(group);
            setDependencyStats(deps);
        } catch (e) {
            toast({ title: "Errore controllo", description: "Impossibile verificare dipendenze.", variant: "destructive" });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const initiateResolveAll = async () => {
        setConfirmingAll(true);
        setConfirmingGroup(null); // Just a flag
        setIsCheckingDependencies(true);
        setDependencyStats(null);

        try {
            // Aggregate dependencies for ALL groups
            let totalAppts = 0;
            let totalDocs = 0;
            let totalLogs = 0;

            // Run in parallel for speed, or seq? Parallel is fine for read-only checks
            const promises = processedGroups.map(g => checkGroupDependencies(g));
            const results = await Promise.all(promises);

            results.forEach(res => {
                if (res) {
                    totalAppts += (res.appointments || 0);
                    totalDocs += (res.documents || 0);
                    totalLogs += (res.assignment_logs || 0);
                }
            });

            setDependencyStats({
                appointments: totalAppts,
                documents: totalDocs,
                assignment_logs: totalLogs
            });
        } catch (e) {
             toast({ title: "Errore controllo", description: "Impossibile verificare dipendenze massive.", variant: "destructive" });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const executeResolution = async () => {
        setIsResolving(true);
        
        try {
            if (confirmingAll) {
                await handleResolveAll();
            } else if (confirmingGroup) {
                await handleSingleResolve(confirmingGroup);
            }
        } catch (error) {
            console.error("Resolution failed:", error);
        } finally {
            setIsResolving(false);
            setConfirmingGroup(null);
            setConfirmingAll(false);
        }
    };

    // --- Core Resolution Logic (Called after confirmation) ---

    const handleResolveAll = async () => {
        let deletedCount = 0;
        let resolvedCount = 0;
        let errors = 0;

        for (const group of processedGroups) {
            const masterId = selectedMasters[group.key];
            if (!masterId) continue;

            const idsToDelete = group.records
                .filter(r => r.id !== masterId)
                .map(r => r.id);
            
            // Skip if nothing to delete
            if (idsToDelete.length === 0) continue;

            try {
                const success = await resolveGroup(group.key, masterId, idsToDelete);
                if (success) {
                    deletedCount += idsToDelete.length;
                    resolvedCount++;
                } else {
                    errors++;
                }
            } catch (err) {
                errors++;
            }
        }
        
        setStats({ resolved: resolvedCount, deleted: deletedCount });
        
        if (errors > 0) {
            toast({
                title: "Operazione completata con errori",
                description: `${resolvedCount} gruppi risolti. ${errors} gruppi hanno fallito. Riprova.`,
                variant: "warning"
            });
        } else {
             toast({
                title: "Tutto risolto!",
                description: `Operazione completata con successo.`,
                className: "bg-green-50 border-green-200"
            });
            if (onComplete) onComplete();
        }
    };

    const handleSingleResolve = async (group) => {
        const masterId = selectedMasters[group.key];
        if (!masterId) return;

        const idsToDelete = group.records
            .filter(r => r.id !== masterId)
            .map(r => r.id);

        const success = await resolveGroup(group.key, masterId, idsToDelete);
        if (success) {
            setStats(prev => ({
                resolved: prev.resolved + 1,
                deleted: prev.deleted + idsToDelete.length
            }));
            
            if (groups.length === 1 && onComplete) {
                setTimeout(onComplete, 500); 
            }
        }
    };

    const formatContactDate = (dateStr) => {
        if (!dateStr) return "Mai richiamato";
        try {
            const date = parseISO(dateStr);
            if (!isValid(date)) return "Data non valida";
            const hasTime = dateStr.includes('T') || dateStr.includes(' ');
            const formatString = hasTime ? "dd MMM yyyy - HH:mm" : "dd MMM yyyy";
            return format(date, formatString, { locale: it });
        } catch (e) {
            return dateStr;
        }
    };

    // Calculate total dependencies for display in warning
    const totalDependencies = (dependencyStats?.appointments || 0) + (dependencyStats?.documents || 0) + (dependencyStats?.assignment_logs || 0);

    return (
        <TooltipProvider>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
                    <ModalErrorBoundary onRetry={findDuplicates}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                Gestione Duplicati: {tableName}
                            </DialogTitle>
                            <DialogDescription>
                                Rilevati {groups.length} gruppi di duplicati basati su "{keyField}". 
                                I record suggeriti sono evidenziati.
                            </DialogDescription>
                        </DialogHeader>

                        {loading && (groups.length === 0) ? (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <div className="text-center">
                                    <p className="font-medium">Ricerca duplicati in corso...</p>
                                    <p className="text-sm text-muted-foreground">Analisi della tabella e raggruppamento dati.</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-destructive space-y-4">
                                <AlertTriangle className="h-12 w-12" />
                                <div className="text-center max-w-md">
                                    <p className="font-medium text-lg">Errore durante la ricerca</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {error.message || "Impossibile recuperare i duplicati."}
                                    </p>
                                </div>
                                <Button onClick={() => findDuplicates()} variant="outline" className="gap-2">
                                    <RefreshCw className="h-4 w-4" /> Riprova
                                </Button>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                <CheckCircle className="h-16 w-16 text-green-500 mb-4 opacity-80" />
                                <p className="text-xl font-medium text-slate-900">Nessun duplicato trovato!</p>
                                <p className="text-sm mt-1">La tabella è pulita e ottimizzata.</p>
                                {stats.resolved > 0 && (
                                    <div className="mt-6 bg-green-50 border border-green-100 p-4 rounded-lg text-green-800 text-sm">
                                        <p className="font-semibold mb-1">Riepilogo Sessione</p>
                                        <p>✅ {stats.resolved} gruppi risolti</p>
                                        <p>🗑️ {stats.deleted} record eliminati</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <ScrollArea className="flex-1 pr-4 bg-slate-50/50 rounded-md border p-2">
                                <div className="space-y-6">
                                    {processedGroups.map((group) => (
                                        <div key={group.key} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                            <div className="bg-slate-100 px-4 py-2 flex justify-between items-center border-b">
                                                <div className="font-medium text-sm flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-white">{keyField}: {group.key}</Badge>
                                                    <span className="text-muted-foreground">({group.records.length} record)</span>
                                                </div>
                                                <Button size="sm" variant="secondary" onClick={() => initiateSingleResolve(group)}>
                                                    Risolvi questo gruppo
                                                </Button>
                                            </div>
                                            
                                            <div className="p-4">
                                                <RadioGroup 
                                                    value={selectedMasters[group.key]} 
                                                    onValueChange={(val) => setSelectedMasters(prev => ({ ...prev, [group.key]: val }))}
                                                    className="space-y-3"
                                                >
                                                    {group.records.map((record, index) => {
                                                        const isMaster = selectedMasters[group.key] === record.id;
                                                        // Top sorted record is our "Automatic Suggestion"
                                                        const isSuggested = index === 0; 
                                                        const contactDate = getContactDate(record);
                                                        
                                                        return (
                                                            <div 
                                                                key={record.id} 
                                                                className={`flex items-start space-x-3 p-3 rounded border transition-all 
                                                                    ${isMaster 
                                                                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20' 
                                                                        : 'border-slate-200 hover:bg-slate-50'}
                                                                `}
                                                            >
                                                                <RadioGroupItem value={record.id} id={`${group.key}-${record.id}`} className="mt-1" />
                                                                
                                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 text-sm items-start">
                                                                    {/* Main Info */}
                                                                    <div className="md:col-span-4">
                                                                        <Label htmlFor={`${group.key}-${record.id}`} className="font-semibold cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2">
                                                                            {record.nome || record.name || 'Senza Nome'} {record.cognome || ''}
                                                                            {isSuggested && (
                                                                                <Tooltip>
                                                                                    <TooltipTrigger>
                                                                                        <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-700 hover:bg-blue-200 gap-1 px-1.5">
                                                                                            <Info className="h-3 w-3" /> Suggerito
                                                                                        </Badge>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent className="max-w-[250px]">
                                                                                        <p>Record suggerito automaticamente perché ha l'aggiornamento e/o il richiamo più recente.</p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            )}
                                                                        </Label>
                                                                        <div className="text-xs text-muted-foreground mt-1 truncate">{record.email || 'Nessuna email'}</div>
                                                                        <div className="text-xs text-muted-foreground mt-0.5 font-mono bg-slate-100 inline-block px-1 rounded">ID: {record.id.slice(0,8)}...</div>
                                                                    </div>

                                                                    {/* Dates & Status */}
                                                                    <div className="md:col-span-5 flex flex-col space-y-1.5 text-xs text-muted-foreground">
                                                                         <div className={`flex items-center gap-2 ${contactDate ? 'text-slate-900 font-medium' : ''}`}>
                                                                            <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                                                                            <span>
                                                                                Ultimo richiamo: {formatContactDate(contactDate)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                                            <span>
                                                                                Aggiornato: {record.updated_at ? formatDistanceToNow(new Date(record.updated_at), { addSuffix: true, locale: it }) : 'N/A'}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="md:col-span-3 flex items-center justify-end gap-2 pt-1">
                                                                        {isMaster ? (
                                                                            <Badge className="bg-blue-600 hover:bg-blue-700 transition-colors cursor-default">
                                                                                <CheckCircle className="h-3 w-3 mr-1" /> Mantiene
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 flex items-center gap-1 cursor-default">
                                                                                <Trash2 className="h-3 w-3" /> Elimina
                                                                            </Badge>
                                                                        )}
                                                                        <Button variant="ghost" size="sm" onClick={() => setViewRecord(record)} className="h-8 w-8 p-0">
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </RadioGroup>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}

                        <DialogFooter className="mt-4 gap-2 border-t pt-4">
                            <div className="flex-1 text-sm text-muted-foreground self-center">
                                {stats.resolved > 0 && <span className="text-green-600 font-medium">Sessione corrente: {stats.resolved} risolti | {stats.deleted} eliminati</span>}
                            </div>
                            <Button variant="outline" onClick={onClose}>Chiudi</Button>
                            {groups.length > 0 && (
                                <Button onClick={initiateResolveAll} disabled={loading} className="min-w-[140px]">
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Risolvi Tutto ({groups.length})
                                </Button>
                            )}
                        </DialogFooter>
                    </ModalErrorBoundary>
                </DialogContent>
            </Dialog>

            {/* Confirmation Alert Dialog */}
            <AlertDialog open={!!confirmingGroup || confirmingAll} onOpenChange={(open) => {
                if (!open) {
                    setConfirmingGroup(null);
                    setConfirmingAll(false);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="h-5 w-5" />
                            Conferma Eliminazione Definitiva
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            {isCheckingDependencies ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Verifica dipendenze in corso...</span>
                                </div>
                            ) : (
                                <>
                                    <p>
                                        Stai per eliminare definitivamente {confirmingAll ? 'tutti i duplicati' : 'i record duplicati di questo gruppo'}. 
                                        L'operazione è <strong>irreversibile</strong>.
                                    </p>
                                    
                                    {totalDependencies > 0 && (
                                        <div className="bg-orange-50 border border-orange-200 p-3 rounded-md text-sm text-orange-800">
                                            <p className="font-semibold mb-1">Attenzione: Dati Correlati</p>
                                            <p>L'eliminazione rimuoverà anche:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-0.5 ml-1">
                                                {dependencyStats?.appointments > 0 && <li>{dependencyStats.appointments} appuntamenti</li>}
                                                {dependencyStats?.documents > 0 && <li>{dependencyStats.documents} documenti</li>}
                                                {dependencyStats?.assignment_logs > 0 && <li>{dependencyStats.assignment_logs} log di assegnazione</li>}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {totalDependencies === 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            Nessun dato correlato (appuntamenti, documenti) verrà perso.
                                        </p>
                                    )}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isResolving}>Annulla</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault(); // Handle async manually
                                executeResolution();
                            }}
                            disabled={isCheckingDependencies || isResolving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isResolving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Elaborazione...</>
                            ) : (
                                "Conferma ed Elimina"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <RecordViewModal 
                isOpen={!!viewRecord} 
                onClose={() => setViewRecord(null)} 
                record={viewRecord} 
                tableName={tableName} 
            />
        </TooltipProvider>
    );
};

export default DuplicatesManagementModal;
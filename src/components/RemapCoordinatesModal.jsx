import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { remapTableCoordinates, getTableSchema } from '@/utils/geocodingService';
import { useFormDraftManager } from '@/hooks/useFormDraftManager';

const RemapCoordinatesModal = ({ tableName, isOpen, onClose, selectedIds = [] }) => {
    // Draft Manager
    const DRAFT_KEY = `draft_remap_${tableName}`;
    const { draft, saveDraftField, clearDraft } = useFormDraftManager(DRAFT_KEY);

    const [step, setStep] = useState('selection'); // selection, processing, result
    const [stats, setStats] = useState({ total: 0, missing: 0, valid: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [mode, setMode] = useState('missing'); // 'missing', 'all', 'selected'
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [results, setResults] = useState(null);

    const schema = getTableSchema(tableName);

    useEffect(() => {
        if (isOpen && tableName) {
            fetchStats();
            setStep('selection');
            setResults(null);
            setProgress(0);
            
            // Restore draft mode if exists
            if (draft && draft.mode) {
                setMode(draft.mode);
            }
        }
    }, [isOpen, tableName, draft]);

    const handleModeChange = (val) => {
        setMode(val);
        saveDraftField('mode', val);
    };

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const { count: total } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
            const { count: valid } = await supabase.from(tableName).select('*', { count: 'exact', head: true }).not('lat', 'is', null);
            
            setStats({
                total: total || 0,
                valid: valid || 0,
                missing: (total || 0) - (valid || 0)
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleRemap = async () => {
        setStep('processing');
        try {
            const result = await remapTableCoordinates(tableName, { mode, selectedIds }, (current, total) => {
                const percentage = Math.round((current / total) * 100);
                setProgress(percentage);
                setProgressLabel(`${current} di ${total} record elaborati`);
            });
            setResults(result);
            setStep('result');
            clearDraft(); // Clear preference draft on success
        } catch (error) {
            console.error("Remap error:", error);
        }
    };

    const handleClose = () => {
        if (step === 'processing') return; 
        onClose();
        if (step === 'result') {
            // cleanup
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-500" />
                        Rimappa Coordinate: {schema?.label || tableName}
                    </DialogTitle>
                    <DialogDescription>
                        Aggiorna le coordinate geografiche (Lat/Lng) basate sull'indirizzo.
                    </DialogDescription>
                </DialogHeader>

                {step === 'selection' && (
                    <div className="py-4 space-y-6">
                        {loadingStats ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div className="bg-slate-50 p-2 rounded border">
                                    <div className="font-bold text-slate-700">{stats.total}</div>
                                    <div className="text-xs text-muted-foreground">Totali</div>
                                </div>
                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                    <div className="font-bold text-red-600">{stats.missing}</div>
                                    <div className="text-xs text-red-800">Senza Coord.</div>
                                </div>
                                <div className="bg-green-50 p-2 rounded border border-green-100">
                                    <div className="font-bold text-green-600">{stats.valid}</div>
                                    <div className="text-xs text-green-800">Validi</div>
                                </div>
                            </div>
                        )}

                        <RadioGroup value={mode} onValueChange={handleModeChange} className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="missing" id="r1" />
                                <Label htmlFor="r1">Rimappa solo record senza coordinate ({stats.missing})</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="r2" />
                                <Label htmlFor="r2">Rimappa tutti i record ({stats.total})</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="selected" id="r3" disabled={!selectedIds || selectedIds.length === 0} />
                                <Label htmlFor="r3" className={(!selectedIds || selectedIds.length === 0) ? "text-muted-foreground" : ""}>
                                    Rimappa record selezionati ({selectedIds?.length || 0})
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="py-8 flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <div className="w-full space-y-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-center text-muted-foreground">{progressLabel}</p>
                        </div>
                        <p className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded border border-yellow-100">
                            Non chiudere questa finestra.
                        </p>
                    </div>
                )}

                {step === 'result' && results && (
                    <div className="py-4 space-y-4">
                        <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                            <CheckCircle2 className="h-6 w-6" />
                            <span className="font-bold text-lg">Operazione Completata</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-3 bg-green-50 rounded border border-green-100">
                                <div className="text-xl font-bold text-green-700">{results.success}</div>
                                <div className="text-xs text-green-800">Geocodificati</div>
                            </div>
                            <div className="p-3 bg-red-50 rounded border border-red-100">
                                <div className="text-xl font-bold text-red-700">{results.failed}</div>
                                <div className="text-xs text-red-800">Falliti / Non Trovati</div>
                            </div>
                        </div>

                        {results.errors.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-500" /> Dettagli Errori
                                </h4>
                                <ScrollArea className="h-[150px] w-full rounded border p-2 bg-slate-50">
                                    <ul className="space-y-2">
                                        {results.errors.map((err, i) => (
                                            <li key={i} className="text-xs text-slate-600 border-b pb-1 last:border-0">
                                                <span className="font-mono text-slate-400">ID: {err.id?.slice(0, 8)}...</span>
                                                {err.address && <div className="font-medium">{err.address}</div>}
                                                <div className="text-red-500">{err.reason}</div>
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === 'selection' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>Annulla</Button>
                            <Button onClick={handleRemap}>Avvia Rimappatura</Button>
                        </>
                    )}
                    {step === 'result' && (
                        <Button onClick={handleClose}>Chiudi</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RemapCoordinatesModal;
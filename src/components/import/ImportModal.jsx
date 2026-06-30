import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Upload, File, ArrowRight, Loader2, Download, AlertTriangle, CheckCircle, XCircle, Scissors, Trash2, ShoppingBag, Store, Activity, FileText } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import ColumnMappingForm from './ColumnMappingForm';
import { importDataWithMapping, generateCSVTemplate, validateAndPreviewBatch } from '@/utils/csvImportService';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useFormDraftManager } from '@/hooks/useFormDraftManager';
import ImportReportModal from './ImportReportModal';
import { saveMappingForTable } from '@/services/mappingPersistenceService';
import { useImportDeduplication } from '@/hooks/useImportDeduplication';

const ImportModal = ({ isOpen, onClose, onImportSuccess, tableName }) => {
    const { user } = useAuth();
    const DRAFT_KEY = `draft_import_mapping_${tableName}_${user?.id}`;
    const { draft, saveDraftObject, clearDraft } = useFormDraftManager(DRAFT_KEY);

    const [step, setStep] = useState(1); 
    const [file, setFile] = useState(null);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [rawAllData, setRawAllData] = useState([]);
    const [mapping, setMapping] = useState({});
    const [importStats, setImportStats] = useState(null);
    const [validationSummary, setValidationSummary] = useState(null);
    const [selectedType, setSelectedType] = useState(null); 
    const [isReportOpen, setIsReportOpen] = useState(false);
    
    // New Hook Integration
    const { progress, isProcessing, report: finalReport, executeImport } = useImportDeduplication(tableName);

    const { toast } = useToast();

    // Restore draft mapping on open
    useEffect(() => {
        if (isOpen) {
            if (tableName === 'potential_activities') {
                setStep(0);
            } else {
                setStep(1);
            }
            if (draft && Object.keys(draft).length > 0) {
                setMapping(draft);
            }
        }
    }, [isOpen, tableName, draft]);

    const handleMappingChange = (newMapping) => {
        setMapping(newMapping);
        saveDraftObject(newMapping);
    };

    const reset = () => {
        setFile(null);
        setCsvHeaders([]);
        setRawAllData([]);
        setMapping({});
        setImportStats(null);
        setValidationSummary(null);
        setSelectedType(null);
        setIsReportOpen(false);
        if (tableName === 'potential_activities') {
            setStep(0);
        } else {
            setStep(1);
        }
    };

    const handleTypeSelection = (type) => {
        setSelectedType(type);
        setStep(1);
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) setFile(f);
    };

    const handleParse = () => {
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvHeaders(results.meta.fields);
                setRawAllData(results.data);
                setStep(2);
            },
            error: (err) => {
                toast({ title: "Errore CSV", description: err.message, variant: "destructive" });
            }
        });
    };

    const handleDownloadTemplate = () => {
        const csv = generateCSVTemplate(tableName);
        if (csv) {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `template_${tableName}.csv`;
            link.click();
        }
    };

    const handleProceedToValidation = () => {
        // Auto Save Mapping when user proceeds
        saveMappingForTable(tableName, mapping);

        const validatedRows = validateAndPreviewBatch(tableName, rawAllData, mapping);
        
        const errors = validatedRows.filter(r => r._status === 'error');
        const warnings = validatedRows.filter(r => r._status === 'warning');
        
        setValidationSummary({
            total: validatedRows.length,
            validCount: validatedRows.length - errors.length,
            errorCount: errors.length,
            warningCount: warnings.length,
            errors: errors.slice(0, 50), 
            warnings: warnings.slice(0, 50)
        });
        
        setStep(3);
    };

    const triggerImport = async () => {
        setStep(4);
        
        const rowsToProcess = rawAllData.map(row => {
             const newRow = {};
             Object.keys(mapping).forEach(csvKey => {
                 newRow[mapping[csvKey]] = row[csvKey];
             });
             return newRow;
        });

        const additionalData = {};
        if (selectedType) {
            additionalData.type = selectedType;
        }

        // Use new CSV service which uses deduplication service internally
        const result = await importDataWithMapping(tableName, rowsToProcess, user.id, null, additionalData);
        setImportStats(result);
        
        if (result && result.success) {
            clearDraft();
            setIsReportOpen(true);
            setStep(5);
        } else {
             toast({ title: "Errore Importazione", description: result?.error || "Si è verificato un errore.", variant: "destructive" });
             setStep(3); // Go back
        }
    };

    const handleClose = () => {
        reset();
        onClose();
        if (importStats?.success) {
            onImportSuccess();
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(val) => !val && handleClose()}>
                <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Importazione Dati: {tableName}</DialogTitle>
                        <DialogDescription>
                            {step === 0 && "Seleziona il tipo di attività da importare."}
                            {step === 1 && "Carica il file CSV."}
                            {step === 2 && "Mappa e verifica l'anteprima dei dati."}
                            {step === 3 && "Riepilogo validazione prima dell'import."}
                            {step === 4 && "Elaborazione in corso... Attendere."}
                            {step === 5 && "Importazione completata."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden py-4">
                        {/* STEP 0: TYPE SELECTION */}
                        {step === 0 && (
                            <div className="flex flex-col items-center justify-center h-full gap-8">
                                <h3 className="text-xl font-medium text-gray-700">Che cosa vuoi importare?</h3>
                                <div className="flex gap-6 w-full max-w-2xl justify-center">
                                    <button onClick={() => handleTypeSelection('acquirente')} className="flex flex-col items-center gap-4 p-8 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all w-64 group">
                                        <div className="p-4 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <ShoppingBag className="h-10 w-10" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-lg">Acquirenti</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Chi cerca un'attività</p>
                                        </div>
                                    </button>
                                    <button onClick={() => handleTypeSelection('venditore')} className="flex flex-col items-center gap-4 p-8 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all w-64 group">
                                        <div className="p-4 rounded-full bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                            <Store className="h-10 w-10" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-lg">Venditori</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Chi vende un'attività</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 1: UPLOAD */}
                        {step === 1 && (
                            <div className="flex flex-col items-center justify-center h-full gap-6">
                                {selectedType && (
                                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium flex items-center mb-4">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Importazione: {selectedType === 'acquirente' ? 'Acquirenti' : 'Venditori'}
                                    </div>
                                )}
                                <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center gap-4 bg-muted/20 w-full max-w-md">
                                    <Upload className="h-12 w-12 text-muted-foreground" />
                                    <div className="text-center">
                                        <p className="font-medium">Trascina il file o clicca per selezionare</p>
                                        <p className="text-xs text-muted-foreground mt-1">Accetta solo .csv</p>
                                    </div>
                                    <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"/>
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="outline" onClick={handleDownloadTemplate}>
                                        <Download className="mr-2 h-4 w-4" /> Scarica Template
                                    </Button>
                                    <Button disabled={!file} onClick={handleParse}>
                                        Avanti <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: MAPPING */}
                        {step === 2 && (
                            <ColumnMappingForm 
                                tableName={tableName} 
                                csvHeaders={csvHeaders} 
                                rawData={rawAllData}
                                onMappingChange={handleMappingChange}
                                selectedType={selectedType}
                            />
                        )}

                        {/* STEP 3: VALIDATION SUMMARY */}
                        {step === 3 && validationSummary && (
                            <div className="flex flex-col h-full gap-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <Card className="p-4 flex flex-col items-center justify-center bg-slate-50">
                                        <span className="text-2xl font-bold">{validationSummary.total}</span>
                                        <span className="text-xs text-muted-foreground uppercase">Totale Record</span>
                                    </Card>
                                    <Card className="p-4 flex flex-col items-center justify-center bg-green-50 border-green-200">
                                        <span className="text-2xl font-bold text-green-700">{validationSummary.validCount}</span>
                                        <span className="text-xs text-green-800 uppercase">Validi</span>
                                    </Card>
                                    <Card className="p-4 flex flex-col items-center justify-center bg-yellow-50 border-yellow-200">
                                        <span className="text-2xl font-bold text-yellow-700">{validationSummary.warningCount}</span>
                                        <span className="text-xs text-yellow-800 uppercase">Avvisi</span>
                                    </Card>
                                    <Card className={`p-4 flex flex-col items-center justify-center border-red-200 ${validationSummary.errorCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                                        <span className={`text-2xl font-bold ${validationSummary.errorCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>{validationSummary.errorCount}</span>
                                        <span className={`text-xs uppercase ${validationSummary.errorCount > 0 ? 'text-red-800' : 'text-slate-400'}`}>Errori</span>
                                    </Card>
                                </div>

                                <Alert variant={validationSummary.errorCount > 0 ? "destructive" : "default"} className={validationSummary.errorCount === 0 ? "bg-green-50 border-green-200 text-green-800" : ""}>
                                    {validationSummary.errorCount > 0 ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle className="h-4 w-4 text-green-600"/>}
                                    <AlertTitle>
                                        {validationSummary.errorCount > 0 ? "Attenzione: Problemi rilevati" : "Dati pronti per l'importazione"}
                                    </AlertTitle>
                                    <AlertDescription>
                                        {validationSummary.errorCount > 0 
                                            ? `Ci sono ${validationSummary.errorCount} record con errori critici. Se procedi, i valori non validi verranno ignorati.` 
                                            : "Tutti i dati sembrano corretti."}
                                    </AlertDescription>
                                </Alert>

                                {(validationSummary.errorCount > 0 || validationSummary.warningCount > 0) && (
                                    <div className="flex-1 border rounded-md overflow-hidden flex flex-col bg-white">
                                        <div className="bg-slate-100 p-2 border-b text-xs font-semibold text-slate-700">Dettagli Problemi (Primi 50)</div>
                                        <ScrollArea className="flex-1 p-0">
                                            <div className="divide-y">
                                                {[...validationSummary.errors, ...validationSummary.warnings].map((row, i) => (
                                                    <div key={i} className={`p-3 text-sm flex gap-3 ${row._status === 'error' ? 'bg-red-50/50' : 'bg-yellow-50/50'}`}>
                                                        <Badge variant="outline" className="h-6 shrink-0">{row._original.nome || `Riga?`}</Badge>
                                                        <div className="flex-1 space-y-1">
                                                            {row._errors.map((e, idx) => <div key={`e-${idx}`} className="text-red-600 flex items-center text-xs font-medium"><XCircle className="h-3 w-3 mr-1"/> {e}</div>)}
                                                            {row._warnings.map((w, idx) => <div key={`w-${idx}`} className="text-yellow-700 flex items-center text-xs"><AlertTriangle className="h-3 w-3 mr-1"/> {w}</div>)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 4: PROGRESS */}
                        {step === 4 && (
                            <div className="flex flex-col items-center justify-center h-full gap-8 max-w-lg mx-auto w-full">
                                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                <div className="space-y-2 text-center w-full">
                                    <h3 className="text-xl font-semibold">Elaborazione in corso...</h3>
                                    <p className="text-muted-foreground text-sm">Inserimento e aggiornamento dati nel database.</p>
                                </div>
                                <div className="w-full space-y-1">
                                    <Progress value={90} className="w-full animate-pulse" />
                                    <p className="text-xs text-center text-muted-foreground">L'operazione potrebbe richiedere qualche minuto...</p>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: RESULT */}
                        {step === 5 && importStats && (
                            <div className="flex flex-col items-center justify-center h-full gap-6">
                                <CheckCircle className="h-20 w-20 text-green-500" />
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-bold">Importazione Completata!</h3>
                                    <p className="text-muted-foreground">
                                        Sono stati elaborati {importStats.totalProcessed} record.
                                    </p>
                                </div>
                                <Button onClick={() => setIsReportOpen(true)} size="lg" className="mt-4">
                                    <FileText className="mr-2 h-4 w-4" /> Visualizza Report Dettagliato
                                </Button>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {step === 1 && tableName === 'potential_activities' && (
                            <Button variant="outline" onClick={() => setStep(0)}>Indietro</Button>
                        )}
                        {step === 2 && (
                            <>
                                <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
                                <Button onClick={handleProceedToValidation} disabled={Object.keys(mapping).length === 0}>
                                    Analizza Dati <Activity className="ml-2 h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                <Button variant="outline" onClick={() => setStep(2)}>Torna alla Mappatura</Button>
                                <Button 
                                    onClick={triggerImport} 
                                    variant={validationSummary.errorCount > 0 ? "destructive" : "default"}
                                >
                                    {validationSummary.errorCount > 0 ? "Importa Comunque" : "Avvia Importazione"}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {step === 5 && (
                            <Button onClick={handleClose} variant="secondary">Chiudi</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ImportReportModal 
                isOpen={isReportOpen} 
                onClose={() => setIsReportOpen(false)} 
                report={importStats?.detailedReport}
                tableName={tableName}
            />
        </>
    );
};

export default ImportModal;
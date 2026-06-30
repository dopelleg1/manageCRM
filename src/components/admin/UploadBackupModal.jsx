import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ShieldCheck, Loader2, UploadCloud, FileArchive as FileZip } from 'lucide-react';
import { useBackupUpload } from '@/hooks/useBackupUpload';

const UploadBackupModal = ({ isOpen, onClose, onComplete }) => {
    const { 
        file,
        handleFileChange,
        createProtectionBackup, 
        uploadBackup, 
        isCreatingProtection, 
        isUploading, 
        protectionCreated,
        progress,
        reset 
    } = useBackupUpload();

    useEffect(() => {
        if (isOpen) reset();
    }, [isOpen]);

    const handleCreateProtection = async () => {
        await createProtectionBackup();
    };

    const handleProceedUpload = async () => {
        const success = await uploadBackup();
        if (success && onComplete) {
            setTimeout(() => {
                onClose();
                onComplete();
            }, 1000);
        }
    };

    const handleClose = () => {
        if (!isCreatingProtection && !isUploading) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-green-600" />
                        Carica Backup
                    </DialogTitle>
                    <DialogDescription>
                        Carica un file di backup (.zip) generato in precedenza per renderlo disponibile nel sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Step 1: Seleziona File */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Seleziona File di Backup (.zip)</label>
                        <Input 
                            type="file" 
                            accept=".zip" 
                            onChange={handleFileChange} 
                            disabled={isUploading || isCreatingProtection || protectionCreated}
                            className="cursor-pointer"
                        />
                        {file && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                                <FileZip className="h-4 w-4" /> 
                                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </div>
                        )}
                    </div>

                    {file && !protectionCreated && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-4 text-amber-800 dark:text-amber-200 text-sm">
                                <p className="font-semibold flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Azione Consigliata
                                </p>
                                <p>Prima di caricare nuovi dati che potrebbero sovrascrivere o essere ripristinati, ti consigliamo di creare un backup di protezione dello stato attuale.</p>
                            </div>
                            <Button 
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white" 
                                onClick={handleCreateProtection}
                                disabled={isCreatingProtection}
                            >
                                {isCreatingProtection ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creazione in corso...</>
                                ) : (
                                    <><ShieldCheck className="mr-2 h-4 w-4" /> Crea Backup Ora</>
                                )}
                            </Button>
                        </div>
                    )}

                    {file && protectionCreated && !isUploading && (
                        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md p-4 text-green-800 dark:text-green-200 text-sm flex items-center gap-3 animate-in fade-in">
                            <ShieldCheck className="h-8 w-8 text-green-600 shrink-0" />
                            <div>
                                <p className="font-semibold">Backup di protezione creato!</p>
                                <p>Puoi procedere al caricamento del nuovo file.</p>
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="space-y-2 animate-in fade-in">
                            <div className="flex justify-between text-sm">
                                <span>Caricamento in corso...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="w-full" />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isCreatingProtection || isUploading}>
                        Annulla
                    </Button>
                    <Button 
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleProceedUpload} 
                        disabled={!file || isUploading || isCreatingProtection}
                    >
                        {isUploading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento...</>
                        ) : (
                            <><UploadCloud className="mr-2 h-4 w-4" /> Carica Backup</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UploadBackupModal;
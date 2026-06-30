import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { useBackupRestore } from '@/hooks/useBackupRestore';

const RestoreConfirmationModal = ({ isOpen, onClose, backup, onComplete }) => {
    const { 
        createProtectionBackup, 
        performRestore, 
        isCreatingProtection, 
        isRestoring, 
        protectionCreated, 
        reset 
    } = useBackupRestore();

    useEffect(() => {
        if (isOpen) {
            reset();
        }
    }, [isOpen]);

    const handleCreateProtection = async () => {
        await createProtectionBackup();
    };

    const handleProceedRestore = async () => {
        if (!backup) return;
        const success = await performRestore(backup.id);
        if (success && onComplete) {
            onComplete();
        }
    };

    if (!backup) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isCreatingProtection && !isRestoring && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Conferma Ripristino Sistema
                    </DialogTitle>
                    <DialogDescription>
                        Stai per ripristinare il sistema alla versione <strong>{backup.version}</strong> del {new Date(backup.date).toLocaleString('it-IT')}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    {!protectionCreated ? (
                        <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-4 text-amber-800 dark:text-amber-200 text-sm">
                                <p className="font-semibold mb-2">Azione Richiesta:</p>
                                <p>Prima di ripristinare, devi creare un backup dello stato attuale per proteggere i tuoi dati!</p>
                            </div>
                            <Button 
                                className="w-full" 
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
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md p-4 text-green-800 dark:text-green-200 text-sm flex items-center gap-3">
                                <ShieldCheck className="h-8 w-8 text-green-600" />
                                <div>
                                    <p className="font-semibold">Backup di protezione creato!</p>
                                    <p>Puoi procedere al ripristino in sicurezza.</p>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground text-center">
                                Il sistema verrà riavviato al termine del ripristino.
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isCreatingProtection || isRestoring}>
                        Annulla
                    </Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleProceedRestore} 
                        disabled={!protectionCreated || isRestoring}
                        className={protectionCreated ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                    >
                        {isRestoring ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ripristino...</>
                        ) : (
                            "Procedi al Ripristino"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RestoreConfirmationModal;
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Download, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AdminTableToolbar = ({ tableName, onImport, onExport, onDeleteAll, onFindDuplicates, hideSearch }) => {
    const { userRole } = useAuth();
    const { toast } = useToast();
    const canManage = ['admin', 'super_admin'].includes(userRole);

    const handleExportClick = () => {
        if (onExport) {
            onExport();
        } else {
            toast({
                title: "Funzionalità non disponibile",
                description: "L'esportazione non è stata ancora implementata per questa tabella.",
                variant: "default"
            });
        }
    };

    if (!canManage) return null;

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mr-auto flex items-center gap-2">
                <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-xs uppercase tracking-wider">Admin Tools</span>
                <span>Gestione {tableName}</span>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {onFindDuplicates && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="secondary" size="sm" onClick={onFindDuplicates} className="flex-1 sm:flex-none border-slate-300">
                                    <Copy className="mr-2 h-4 w-4 text-orange-600" /> Duplicati
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Trova e unisci record duplicati</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                <Button variant="outline" size="sm" onClick={onImport} className="flex-1 sm:flex-none bg-white dark:bg-slate-800 hover:bg-slate-100 border-slate-300">
                    <Upload className="mr-2 h-4 w-4 text-blue-600" /> Importa
                </Button>
                
                <Button variant="outline" size="sm" onClick={handleExportClick} className="flex-1 sm:flex-none bg-white dark:bg-slate-800 hover:bg-slate-100 border-slate-300">
                    <Download className="mr-2 h-4 w-4 text-green-600" /> Esporta
                </Button>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1 sm:flex-none">
                            <Trash2 className="mr-2 h-4 w-4" /> Svuota
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                                <Trash2 className="h-5 w-5"/> Attenzione: Svuotamento Totale
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-3 text-slate-600 dark:text-slate-300">
                                <p>Stai per eliminare <strong>TUTTI</strong> i record presenti nella tabella <strong>{tableName}</strong>.</p>
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                                    <p className="font-bold text-red-600 dark:text-red-400 text-sm">⚠️ Questa azione è irreversibile.</p>
                                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">Tutti i dati verranno cancellati permanentemente. Assicurati di aver fatto un backup (Esporta CSV) prima di procedere.</p>
                                </div>
                                <p>Sei assolutamente sicuro di voler procedere?</p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={onDeleteAll} className="bg-red-600 hover:bg-red-700 text-white">
                                Conferma Svuotamento
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
};

export default AdminTableToolbar;
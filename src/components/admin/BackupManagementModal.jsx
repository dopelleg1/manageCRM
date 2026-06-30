import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Download, Trash2, Settings, Loader2, Bug, Terminal, RotateCcw, UploadCloud } from 'lucide-react';
import { getBackupsList, calculateBackupSize, createCompleteBackup, downloadBackup, deleteBackup } from '@/services/BackupManagementService';
import BackupHistoryLog from './BackupHistoryLog';
import DebugBackupFlow from './DebugBackupFlow';
import RestoreConfirmationModal from './RestoreConfirmationModal';
import UploadBackupModal from './UploadBackupModal';

const BackupManagementModal = () => {
    const { toast } = useToast();
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isDebugMode, setIsDebugMode] = useState(false);
    const [uiLogs, setUiLogs] = useState([]);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [isDownloading, setIsDownloading] = useState(null);

    const addUiLog = (msg) => {
        const timestamp = new Date().toISOString();
        const formattedMsg = `[${timestamp}] [UI] ${msg}`;
        console.log(formattedMsg);
        setUiLogs(prev => [formattedMsg, ...prev].slice(0, 10)); 
    };

    useEffect(() => {
        loadBackups();
    }, [refreshTrigger]);

    const loadBackups = async (logger = console.log) => {
        addUiLog("Calling getBackupsList() to refresh the list...");
        setLoading(true);
        try {
            const data = await getBackupsList(logger);
            addUiLog(`Returned backups array: ${data ? data.length : 0} items retrieved.`);
            setBackups(data || []);
            addUiLog("State updated with new backups array.");
        } catch (error) {
            addUiLog(`Failed to load backups: ${error.message}`);
            toast({ title: "Errore", description: "Impossibile caricare i backup", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const triggerRefresh = () => {
        addUiLog("triggerRefresh() called, triggering loadBackups() and history log refresh.");
        setRefreshTrigger(prev => prev + 1);
    };

    const handleCreateBackup = async () => {
        addUiLog("createCompleteBackup() is called by user...");
        setIsCreating(true);
        try {
            const result = await createCompleteBackup((msg) => console.log(msg));
            addUiLog(`Response from createCompleteBackup(): SUCCESS. Result: ${JSON.stringify(result)}`);
            toast({ title: "Successo", description: "Backup completo generato con successo.", variant: "success" });
            triggerRefresh(); 
        } catch (error) {
            addUiLog(`Response from createCompleteBackup(): ERROR - ${error.message}`);
            toast({ title: "Errore", description: "Generazione backup fallita.", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDownload = async (backup) => {
        setIsDownloading(backup.id);
        try {
            toast({ title: "Download", description: "Preparazione del download in corso..." });
            await downloadBackup(backup.id);
            toast({ title: "Successo", description: "Download avviato con successo.", variant: "success" });
        } catch(e) {
            console.error("Download failed:", e);
            toast({ title: "Errore di Download", description: e.message || "Download fallito.", variant: "destructive" });
        } finally {
            setIsDownloading(null);
        }
    };

    const handleDelete = async (backup) => {
        if(!confirm("Sei sicuro di voler eliminare questo backup? L'azione non è reversibile.")) return;
        addUiLog(`Starting deletion of backup ${backup.id}...`);
        try {
            await deleteBackup(backup.id);
            addUiLog("Backup deleted successfully.");
            toast({ title: "Eliminato", description: "Backup eliminato con successo." });
            triggerRefresh();
        } catch(e) {
            addUiLog(`Deletion failed: ${e.message}`);
            toast({ title: "Errore", description: "Eliminazione fallita.", variant: "destructive" });
        }
    };

    const handleRestoreClick = (backup) => {
        setSelectedBackup(backup);
        setRestoreModalOpen(true);
    };

    const handleSettings = () => {
        toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" });
    };

    return (
        <div className="space-y-8">
            <div className="flex gap-2 justify-between items-center">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={handleCreateBackup} disabled={isCreating}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                        {isCreating ? "Creazione in corso..." : "Crea Backup Completo"}
                    </Button>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setUploadModalOpen(true)}>
                        <UploadCloud className="mr-2 h-4 w-4" /> Carica Backup
                    </Button>
                    <Button variant={isDebugMode ? "default" : "outline"} onClick={() => setIsDebugMode(!isDebugMode)} className={isDebugMode ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}>
                        <Bug className="mr-2 h-4 w-4" /> {isDebugMode ? "Disattiva Debug" : "Modalità Debug"}
                    </Button>
                </div>
                <Button variant="outline" onClick={handleSettings}>
                    <Settings className="mr-2 h-4 w-4" /> Impostazioni
                </Button>
            </div>

            {isDebugMode && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <DebugBackupFlow onComplete={triggerRefresh} />
                </div>
            )}

            <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-950">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Versione</TableHead>
                            <TableHead>Data Creazione</TableHead>
                            <TableHead>Ultimo Ripristino</TableHead>
                            <TableHead>N. Ripristini</TableHead>
                            <TableHead>Dimensione</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {backups.map(b => (
                            <TableRow key={b.id}>
                                <TableCell className="font-mono text-sm font-medium">{b.version}</TableCell>
                                <TableCell>{new Date(b.date).toLocaleString('it-IT')}</TableCell>
                                <TableCell>{b.last_restored ? new Date(b.last_restored).toLocaleString('it-IT') : '-'}</TableCell>
                                <TableCell>{b.restore_count || 0}</TableCell>
                                <TableCell>{calculateBackupSize(b.size)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                        onClick={() => handleDownload(b)} 
                                        title="Scarica ZIP"
                                        disabled={isDownloading === b.id}
                                    >
                                        {isDownloading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    </Button>
                                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => handleRestoreClick(b)} title="Ripristina da questo backup">
                                        <RotateCcw className="h-4 w-4 mr-1" /> Ripristina
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(b)} title="Elimina">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {backups.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessun backup trovato. {isDebugMode ? 'Controlla i log di debug per eventuali errori.' : 'Clicca su "Crea Backup Completo" per iniziare.'}</TableCell>
                            </TableRow>
                        )}
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {isDebugMode && (
                <details className="border rounded-md bg-slate-900 text-slate-300 overflow-hidden">
                    <summary className="flex items-center justify-between w-full p-3 font-mono text-sm bg-slate-950 hover:bg-slate-900 transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2"><Terminal className="h-4 w-4" /> UI State Logs (Last 10)</span>
                    </summary>
                    <div className="p-4 border-t border-slate-800 space-y-1 font-mono text-xs max-h-60 overflow-y-auto">
                        {uiLogs.length === 0 ? (
                            <div className="text-slate-500">Nessun log UI presente.</div>
                        ) : (
                            uiLogs.map((log, i) => (
                                <div key={i} className="py-1 border-b border-slate-800/50 last:border-0">{log}</div>
                            ))
                        )}
                    </div>
                </details>
            )}

            <div className="pt-6 border-t mt-8">
                <h3 className="text-lg font-medium mb-4">Dettaglio Log Backup</h3>
                <BackupHistoryLog refreshTrigger={refreshTrigger} />
            </div>

            <RestoreConfirmationModal 
                isOpen={restoreModalOpen}
                onClose={() => setRestoreModalOpen(false)}
                backup={selectedBackup}
                onComplete={() => {
                    setRestoreModalOpen(false);
                    triggerRefresh();
                }}
            />

            <UploadBackupModal 
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                onComplete={() => {
                    setUploadModalOpen(false);
                    triggerRefresh();
                }}
            />
        </div>
    );
};

export default BackupManagementModal;
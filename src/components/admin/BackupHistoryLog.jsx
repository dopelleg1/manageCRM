import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, MonitorUp, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const BackupHistoryLog = ({ refreshTrigger }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchLogs();
    }, [refreshTrigger]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('backups')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Error fetching backup history logs:", error);
            toast({ title: "Attenzione", description: "Impossibile caricare i dati dei backup", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const formatDateIT = (dateString) => {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('it-IT', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(dateString));
    };

    const isRecentlyRestored = (dateString) => {
        if (!dateString) return false;
        const restoredDate = new Date(dateString);
        const now = new Date();
        const diffHours = (now - restoredDate) / (1000 * 60 * 60);
        return diffHours < 24; 
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Aggiorna Log
                </Button>
            </div>
            <ScrollArea className="h-[400px] border rounded-md bg-white dark:bg-slate-950">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Versione</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data Creazione</TableHead>
                            <TableHead>Ultimo Ripristino</TableHead>
                            <TableHead>N. Ripristini</TableHead>
                            <TableHead>Sorgente</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead>Stato</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map(log => {
                            const recentlyRestored = isRecentlyRestored(log.last_restored);
                            const isUploaded = log.type === 'Caricato' || (log.notes && log.notes.includes('Caricato'));
                            
                            return (
                                <TableRow key={log.id} className={recentlyRestored ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                                    <TableCell className="font-mono">{log.version || '-'}</TableCell>
                                    <TableCell>
                                        {isUploaded ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                Caricato
                                            </Badge>
                                        ) : (
                                            log.type
                                        )}
                                    </TableCell>
                                    <TableCell>{formatDateIT(log.date)}</TableCell>
                                    <TableCell className={recentlyRestored ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                                        {formatDateIT(log.last_restored)}
                                    </TableCell>
                                    <TableCell>
                                        {log.restore_count > 0 ? (
                                            <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 border-amber-200">
                                                {log.restore_count}
                                            </Badge>
                                        ) : 0}
                                    </TableCell>
                                    <TableCell>
                                        {isUploaded ? (
                                            <div className="flex items-center gap-1 text-xs text-blue-600">
                                                <MonitorUp className="h-3 w-3" /> Da computer
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Settings className="h-3 w-3" /> Sistema
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[150px] truncate" title={log.notes}>{log.notes || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={log.status === 'success' || log.status === 'completed' ? 'success' : 'secondary'}>
                                            {log.status || 'Sconosciuto'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {logs.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    Nessun log presente nel sistema.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
};

export default BackupHistoryLog;
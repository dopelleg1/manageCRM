import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Upload, Server, History, AlertTriangle, CheckCircle, Database, ShieldAlert, Trash2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const APP_VERSION = '1.0.0';
const TABLES_TO_BACKUP = [
    'agents', 'telemarketing_contacts', 'potential_activities', 
    'potential_tobacconists', 'properties', 'commercial_activities', 
    'appointments', 'documents', 'configurations', 'super_admin_settings'
];

const BackupRestorePage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    
    // Tab 2 & 3 State
    const [selectedFile, setSelectedFile] = useState(null);
    const [validationResult, setValidationResult] = useState(null);
    
    // Tab 3 Migration State
    const [newSupabaseUrl, setNewSupabaseUrl] = useState('');
    const [newSupabaseKey, setNewSupabaseKey] = useState('');
    const [newDomain, setNewDomain] = useState('');
    const [newEnvVars, setNewEnvVars] = useState(JSON.stringify({
        VITE_SUPABASE_URL: "https://your-project.supabase.co",
        VITE_SUPABASE_ANON_KEY: "your-anon-key"
    }, null, 2));
    const [migrationValidated, setMigrationValidated] = useState(false);

    // Tab 4 State
    const [history, setHistory] = useState([]);
    const [fetchingHistory, setFetchingHistory] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setFetchingHistory(true);
        try {
            const { data, error } = await supabase
                .from('backups')
                .select('*')
                .order('date', { ascending: false });
            if (!error && data) setHistory(data);
        } catch (error) {
            console.error("History fetch error:", error);
        } finally {
            setFetchingHistory(false);
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleBackup = async () => {
        setLoading(true);
        setProgress(0);
        setProgressText('Inizializzazione backup...');
        
        try {
            const zip = new JSZip();
            const dataFolder = zip.folder("data");
            const configFolder = zip.folder("config");
            const metadataFolder = zip.folder("metadata");

            let totalRecords = 0;
            const progressStep = 90 / TABLES_TO_BACKUP.length;

            for (let i = 0; i < TABLES_TO_BACKUP.length; i++) {
                const table = TABLES_TO_BACKUP[i];
                setProgressText(`Esportazione tabella: ${table}...`);
                
                const { data, error } = await supabase.from(table).select('*');
                if (error) throw new Error(`Errore export ${table}: ${error.message}`);
                
                dataFolder.file(`${table}.json`, JSON.stringify(data, null, 2));
                totalRecords += data.length;
                setProgress(prev => prev + progressStep);
            }

            setProgressText('Salvataggio configurazioni...');
            configFolder.file(".env.json", JSON.stringify({
                VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
                TIMESTAMP: new Date().toISOString()
            }, null, 2));

            const metadata = {
                timestamp: new Date().toISOString(),
                version: APP_VERSION,
                tables: TABLES_TO_BACKUP,
                totalRecords
            };
            metadataFolder.file("backup.json", JSON.stringify(metadata, null, 2));

            setProgressText('Generazione file ZIP...');
            const content = await zip.generateAsync({ type: "blob" });
            
            const fileName = `backup_v${APP_VERSION}_${new Date().getTime()}.zip`;
            
            // Upload to Supabase Storage
            setProgressText('Caricamento in cloud...');
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('documents')
                .upload(`backups/${fileName}`, content);

            // Save to history
            await supabase.from('backups').insert({
                version: APP_VERSION,
                type: 'complete',
                date: new Date().toISOString(),
                size: content.size,
                status: uploadError ? 'error' : 'success',
                storage_path: uploadData?.path || null,
                created_by: user?.id
            });

            saveAs(content, fileName);
            toast({ title: "Backup Completato", description: "Il file è stato scaricato con successo.", className: "bg-success text-success-foreground" });
            fetchHistory();
        } catch (error) {
            toast({ title: "Errore Backup", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
            setProgress(100);
            setTimeout(() => { setProgress(0); setProgressText(''); }, 2000);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        setValidationResult(null);
    };

    const validateBackupFile = async () => {
        if (!selectedFile) return;
        setLoading(true);
        setProgressText('Verifica integrità...');
        
        try {
            const zip = await JSZip.loadAsync(selectedFile);
            
            const metadataFile = zip.file("metadata/backup.json");
            if (!metadataFile) throw new Error("File metadata mancante. Formato non valido.");
            
            const metadataStr = await metadataFile.async("string");
            const metadata = JSON.parse(metadataStr);
            
            if (!metadata.version || !metadata.timestamp) throw new Error("Metadata corrotto.");

            const tableStats = [];
            for (const table of TABLES_TO_BACKUP) {
                const file = zip.file(`data/${table}.json`);
                if (file) {
                    const dataStr = await file.async("string");
                    const data = JSON.parse(dataStr);
                    tableStats.push({ name: table, count: data.length });
                }
            }

            setValidationResult({
                isValid: true,
                metadata,
                tableStats
            });
            toast({ title: "Verifica completata", description: "Il backup è valido e pronto per il ripristino." });
        } catch (error) {
            setValidationResult({ isValid: false, error: error.message });
            toast({ title: "Verifica fallita", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
            setProgressText('');
        }
    };

    const executeRestore = async (targetClient = supabase) => {
        setLoading(true);
        setProgress(0);
        try {
            const zip = await JSZip.loadAsync(selectedFile);
            const progressStep = 100 / TABLES_TO_BACKUP.length;

            // Delete in reverse order to respect foreign keys (simplified)
            for (let table of [...TABLES_TO_BACKUP].reverse()) {
                setProgressText(`Svuotamento tabella: ${table}...`);
                await targetClient.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }

            for (let table of TABLES_TO_BACKUP) {
                setProgressText(`Ripristino dati: ${table}...`);
                const file = zip.file(`data/${table}.json`);
                if (file) {
                    const dataStr = await file.async("string");
                    const records = JSON.parse(dataStr);
                    if (records.length > 0) {
                        // Chunking for large inserts
                        const chunkSize = 500;
                        for (let i = 0; i < records.length; i += chunkSize) {
                            const chunk = records.slice(i, i + chunkSize);
                            const { error } = await targetClient.from(table).insert(chunk);
                            if (error) console.error(`Restore error on ${table}:`, error);
                        }
                    }
                }
                setProgress(prev => prev + progressStep);
            }

            toast({ title: "Ripristino Completato", description: "Ricarica la pagina per vedere i cambiamenti.", className: "bg-success text-success-foreground" });
        } catch (error) {
            toast({ title: "Errore Ripristino", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
            setProgress(100);
            setTimeout(() => { setProgress(0); setProgressText(''); }, 2000);
        }
    };

    const testMigrationConnection = async () => {
        try {
            setLoading(true);
            const tempClient = createClient(newSupabaseUrl, newSupabaseKey);
            const { error } = await tempClient.from('agents').select('id').limit(1);
            if (error) throw error;
            
            setMigrationValidated(true);
            toast({ title: "Connessione stabilita", description: "Le credenziali della nuova istanza sono valide." });
        } catch (error) {
            setMigrationValidated(false);
            toast({ title: "Errore di connessione", description: "Verifica URL e API Key.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleMigration = async () => {
        const tempClient = createClient(newSupabaseUrl, newSupabaseKey);
        await executeRestore(tempClient);
        toast({ title: "Migrazione completata", description: "Dati trasferiti. Aggiorna il file .env per usare la nuova istanza." });
    };

    const downloadHistoryBackup = async (path) => {
        if (!path) {
            toast({ title: "Errore", description: "File non trovato", variant: "destructive" });
            return;
        }
        try {
            const { data, error } = await supabase.storage.from('documents').download(path);
            if (error) throw error;
            saveAs(data, path.split('/').pop());
        } catch (err) {
            toast({ title: "Errore download", description: err.message, variant: "destructive" });
        }
    };

    const deleteHistoryBackup = async (id, path) => {
        try {
            if (path) await supabase.storage.from('documents').remove([path]);
            await supabase.from('backups').delete().eq('id', id);
            fetchHistory();
            toast({ title: "Eliminato", description: "Backup rimosso dalla cronologia." });
        } catch (err) {
            toast({ title: "Errore", description: "Impossibile eliminare il backup.", variant: "destructive" });
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            <Helmet><title>Backup & Ripristino</title></Helmet>
            
            <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="h-8 w-8 text-destructive" />
                <h1 className="text-3xl font-bold">Sistema Backup e Migrazione</h1>
            </div>

            {loading && (
                <div className="mb-6 p-4 bg-muted rounded-lg border">
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="font-medium">{progressText}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            <Tabs defaultValue="backup" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="backup" disabled={loading}><Download className="h-4 w-4 mr-2"/> Backup</TabsTrigger>
                    <TabsTrigger value="restore" disabled={loading}><Upload className="h-4 w-4 mr-2"/> Ripristino</TabsTrigger>
                    <TabsTrigger value="migration" disabled={loading}><Server className="h-4 w-4 mr-2"/> Migrazione</TabsTrigger>
                    <TabsTrigger value="history" disabled={loading}><History className="h-4 w-4 mr-2"/> Cronologia</TabsTrigger>
                </TabsList>

                {/* TAB 1: BACKUP */}
                <TabsContent value="backup">
                    <Card>
                        <CardHeader>
                            <CardTitle>Crea Backup Completo</CardTitle>
                            <CardDescription>Genera un archivio ZIP contenente tutti i dati, configurazioni e metadati del database attuale.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-lg border">
                                <Database className="h-10 w-10 text-primary" />
                                <div>
                                    <p className="font-semibold">Stato App: v{APP_VERSION}</p>
                                    <p className="text-sm text-muted-foreground">Tabelle incluse: {TABLES_TO_BACKUP.length}</p>
                                </div>
                            </div>
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Nota</AlertTitle>
                                <AlertDescription>Il backup può richiedere alcuni minuti a seconda delle dimensioni del database.</AlertDescription>
                            </Alert>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleBackup} disabled={loading} className="w-full sm:w-auto">
                                {loading ? 'Elaborazione...' : 'Scarica Backup Completo'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* TAB 2: RESTORE */}
                <TabsContent value="restore">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ripristino Identico</CardTitle>
                            <CardDescription>Ripristina i dati nel database ATTUALE. Attenzione: questo sovrascriverà tutti i dati esistenti.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="backupFile">Seleziona file di backup (.zip)</Label>
                                <Input id="backupFile" type="file" accept=".zip" onChange={handleFileSelect} disabled={loading} />
                            </div>

                            {selectedFile && (
                                <Button variant="secondary" onClick={validateBackupFile} disabled={loading}>Verifica Integrità</Button>
                            )}

                            {validationResult?.isValid && (
                                <div className="mt-4 p-4 border rounded-md bg-success/10">
                                    <div className="flex items-center gap-2 mb-2 text-success">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-semibold">Backup Valido</span>
                                    </div>
                                    <p className="text-sm mb-2">Creato il: {new Date(validationResult.metadata.timestamp).toLocaleString()}</p>
                                    <div className="max-h-40 overflow-auto text-sm border p-2 bg-background rounded">
                                        {validationResult.tableStats.map(stat => (
                                            <div key={stat.name} className="flex justify-between py-1 border-b last:border-0">
                                                <span>{stat.name}</span>
                                                <span className="font-mono">{stat.count} record</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {validationResult?.isValid === false && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Errore di Validazione</AlertTitle>
                                    <AlertDescription>{validationResult.error}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={!validationResult?.isValid || loading} variant="destructive">
                                        Ripristina Dati
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Questo ripristinerà TUTTI i dati al momento del backup. L'operazione è irreversibile e cancellerà i dati inseriti dopo il backup. Continuare?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => executeRestore()} className="bg-destructive text-destructive-foreground">Si, Ripristina</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* TAB 3: MIGRATION */}
                <TabsContent value="migration">
                    <Card>
                        <CardHeader>
                            <CardTitle>Migrazione su Nuova Istanza</CardTitle>
                            <CardDescription>Trasferisci i dati da un backup a un NUOVO progetto Supabase.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid w-full items-center gap-1.5 mb-4">
                                <Label htmlFor="migBackupFile">File di backup sorgente</Label>
                                <Input id="migBackupFile" type="file" accept=".zip" onChange={handleFileSelect} disabled={loading} />
                                {selectedFile && <Button variant="outline" className="mt-2 w-fit" onClick={validateBackupFile}>Verifica File</Button>}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 mt-6 p-4 border rounded bg-secondary/20">
                                <div className="space-y-2">
                                    <Label>Nuovo URL Supabase</Label>
                                    <Input placeholder="https://xxxxx.supabase.co" value={newSupabaseUrl} onChange={e => setNewSupabaseUrl(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nuova API Key</Label>
                                    <Input type="password" placeholder="anon key" value={newSupabaseKey} onChange={e => setNewSupabaseKey(e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Nuovo Dominio (Opzionale)</Label>
                                    <Input placeholder="dev.studiobpitalia.it" value={newDomain} onChange={e => setNewDomain(e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Nuove Variabili d'Ambiente JSON</Label>
                                    <Textarea rows={4} value={newEnvVars} onChange={e => setNewEnvVars(e.target.value)} className="font-mono text-xs" />
                                </div>
                            </div>
                            
                            <Button variant="secondary" onClick={testMigrationConnection} disabled={!newSupabaseUrl || !newSupabaseKey || loading}>
                                Valida Credenziali Destinazione
                            </Button>
                        </CardContent>
                        <CardFooter>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={!validationResult?.isValid || !migrationValidated || loading}>
                                        Avvia Migrazione
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Conferma Migrazione</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Questo ripristinerà i dati nel NUOVO database selezionato. Continuare?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleMigration}>Si, Migra</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* TAB 4: HISTORY */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cronologia Backup</CardTitle>
                            <CardDescription>Elenco dei backup eseguiti in passato.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/Ora</TableHead>
                                        <TableHead>Versione</TableHead>
                                        <TableHead>Dimensione</TableHead>
                                        <TableHead>Stato</TableHead>
                                        <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fetchingHistory ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-4">Caricamento...</TableCell></TableRow>
                                    ) : history.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-4">Nessun backup trovato.</TableCell></TableRow>
                                    ) : (
                                        history.map(b => (
                                            <TableRow key={b.id}>
                                                <TableCell>{new Date(b.date).toLocaleString()}</TableCell>
                                                <TableCell>{b.version}</TableCell>
                                                <TableCell>{formatSize(b.size)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={b.status === 'success' ? 'default' : 'destructive'} className={b.status === 'success' ? 'bg-success hover:bg-success' : ''}>
                                                        {b.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => downloadHistoryBackup(b.storage_path)} disabled={!b.storage_path}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Eliminare backup?</AlertDialogTitle></AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteHistoryBackup(b.id, b.storage_path)} className="bg-destructive">Elimina</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default BackupRestorePage;
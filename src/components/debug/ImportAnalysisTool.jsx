import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileJson, Database, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import Papa from 'papaparse';

// Copy of the configuration from ImportModal for analysis
const TARGET_FIELDS_CONFIG = [
    { key: 'nome', label: 'Nome', type: 'string' },
    { key: 'cognome', label: 'Cognome', type: 'string' },
    { key: 'nome_azienda', label: 'Azienda', type: 'string' },
    { key: 'categoria', label: 'Categoria', type: 'string', configType: 'categoria_attivita' },
    { key: 'tipologia', label: 'Tipologia', type: 'string' },
    { key: 'telefono', label: 'Telefono', type: 'string' },
    { key: 'email', label: 'Email', type: 'string' },
    { key: 'citta', label: 'Città', type: 'string' },
    { key: 'indirizzo', label: 'Indirizzo', type: 'string' },
    { key: 'regione', label: 'Regione', type: 'string' },
    { key: 'data_ultimo_richiamo', label: 'Data Ultimo Richiamo', type: 'date' },
    { key: 'note', label: 'Note', type: 'string' },
    { key: 'stato', label: 'Stato', type: 'string', configType: 'stato_attivita' },
    { key: 'agente_id', label: 'Agente (Nome)', type: 'relation', create: false },
    { key: 'operatore_id', label: 'Operatore (Nome)', type: 'relation', create: false },
    { key: 'anagrafica_type', label: 'Tipo Anagrafica', type: 'string' },
];

const ImportAnalysisTool = () => {
    const [loading, setLoading] = useState(false);
    const [dbSamples, setDbSamples] = useState([]);
    const [stats, setStats] = useState(null);
    const [targetUser, setTargetUser] = useState(null);
    const [csvFile, setCsvFile] = useState(null);
    const [csvPreview, setCsvPreview] = useState([]);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [mappingAnalysis, setMappingAnalysis] = useState(null);

    // Hardcoded target user for this task
    const TARGET_EMAIL = 'studiobp.torino40@gmail.com';

    useEffect(() => {
        fetchTargetUser();
    }, []);

    const fetchTargetUser = async () => {
        const { data } = await supabase.from('agents').select('*').eq('email', TARGET_EMAIL).single();
        setTargetUser(data);
    };

    const runDbAnalysis = async () => {
        setLoading(true);
        try {
            // 1. Get stats
            const { count } = await supabase
                .from('telemarketing_contacts')
                .select('*', { count: 'exact', head: true });

            // 2. Get samples (fetch more to find patterns)
            let query = supabase
                .from('telemarketing_contacts')
                .select(`
                    id, nome, cognome, nome_azienda, telefono, email, 
                    citta, regione, data_ultimo_richiamo, note, 
                    operatore_id, agente_id, created_at
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (targetUser) {
                // Try to filter by user if they are agent or operator
                query = query.or(`agente_id.eq.${targetUser.id},operatore_id.eq.${targetUser.id}`);
            }

            const { data: samples, error } = await query;
            
            if (error) throw error;
            setDbSamples(samples || []);

            // 3. Analyze Nulls in samples
            let nullCounts = {
                telefono: 0,
                email: 0,
                nome_azienda: 0,
                agente: 0
            };

            samples.forEach(s => {
                if (!s.telefono) nullCounts.telefono++;
                if (!s.email) nullCounts.email++;
                if (!s.nome_azienda) nullCounts.nome_azienda++;
                if (!s.agente_id) nullCounts.agente++;
            });

            setStats({
                totalRecords: count,
                sampleSize: samples.length,
                nullCounts
            });

        } catch (e) {
            console.error("Analysis Error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setCsvFile(file);
        
        Papa.parse(file, {
            header: true,
            preview: 5,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvHeaders(results.meta.fields);
                setCsvPreview(results.data);
                analyzeMapping(results.meta.fields);
            }
        });
    };

    const normalizeString = (str) => {
        if (!str) return '';
        return str.toLowerCase().replace(/[\s_]+/g, '');
    };

    const analyzeMapping = (headers) => {
        const analysis = TARGET_FIELDS_CONFIG.map(field => {
            const normalizedFieldLabel = normalizeString(field.label);
            const normalizedFieldKey = normalizeString(field.key);
            
            // Simulation of ImportModal logic
            let bestMatch = null;
            let matchType = 'none';

            headers.forEach(header => {
                const normalizedHeader = normalizeString(header);
                
                if (normalizedHeader === normalizedFieldLabel) {
                    bestMatch = header;
                    matchType = 'exact_label';
                } else if (!bestMatch && normalizedHeader === normalizedFieldKey) {
                    bestMatch = header;
                    matchType = 'exact_key';
                } else if (!bestMatch && (normalizedHeader.includes(normalizedFieldLabel) || normalizedFieldLabel.includes(normalizedHeader))) {
                     bestMatch = header; // Weak match simulation
                     matchType = 'fuzzy';
                }
            });

            return {
                field: field.label,
                key: field.key,
                csvMatch: bestMatch,
                matchType,
                status: bestMatch ? 'mapped' : 'missing'
            };
        });
        setMappingAnalysis(analysis);
    };

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Search className="h-6 w-6 text-blue-600"/>
                    Strumento Diagnostica Importazione
                </h2>
                <Badge variant="outline" className="text-sm">Target: {TARGET_EMAIL}</Badge>
            </div>

            <Tabs defaultValue="database">
                <TabsList>
                    <TabsTrigger value="database">1. Analisi Dati DB</TabsTrigger>
                    <TabsTrigger value="csv_check">2. Verifica CSV vs Config</TabsTrigger>
                    <TabsTrigger value="report">3. Report Finale</TabsTrigger>
                </TabsList>

                {/* TAB 1: DB ANALYSIS */}
                <TabsContent value="database" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campione Dati Recenti (Telemarketing)</CardTitle>
                            <Button onClick={runDbAnalysis} disabled={loading} size="sm">
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Database className="h-4 w-4 mr-2"/>}
                                Analizza DB
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {dbSamples.length > 0 ? (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead>
                                                <TableHead>Azienda</TableHead>
                                                <TableHead>Nome/Cognome</TableHead>
                                                <TableHead>Telefono</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Città</TableHead>
                                                <TableHead>Agente</TableHead>
                                                <TableHead>Data Ult. Richiamo</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {dbSamples.map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-mono text-xs">{row.id.substring(0,8)}...</TableCell>
                                                    <TableCell className={!row.nome_azienda ? "bg-red-50 text-red-500" : ""}>
                                                        {row.nome_azienda || "NULL"}
                                                    </TableCell>
                                                    <TableCell>{row.nome} {row.cognome}</TableCell>
                                                    <TableCell className={!row.telefono ? "bg-red-50 text-red-500" : ""}>
                                                        {row.telefono || "NULL"}
                                                    </TableCell>
                                                    <TableCell>{row.email}</TableCell>
                                                    <TableCell>{row.citta}</TableCell>
                                                    <TableCell>{row.agente_id ? "Assegnato" : "NULL"}</TableCell>
                                                    <TableCell>{row.data_ultimo_richiamo || "-"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">Clicca "Analizza DB" per caricare i dati.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: CSV CHECK */}
                <TabsContent value="csv_check" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Simulazione Mappatura Importazione</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="border-2 border-dashed p-6 rounded-lg text-center">
                                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-debug" />
                                <label htmlFor="csv-debug" className="cursor-pointer bg-primary text-white px-4 py-2 rounded">
                                    Carica CSV per Test
                                </label>
                                {csvFile && <p className="mt-2 text-sm">{csvFile.name}</p>}
                            </div>

                            {mappingAnalysis && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border rounded p-4">
                                        <h3 className="font-bold mb-3">Risultato Mappatura Automatica</h3>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Campo DB (Target)</TableHead>
                                                    <TableHead>Match CSV</TableHead>
                                                    <TableHead>Stato</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {mappingAnalysis.map((m, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>{m.field} <span className="text-xs text-gray-400">({m.key})</span></TableCell>
                                                        <TableCell>{m.csvMatch || '-'}</TableCell>
                                                        <TableCell>
                                                            {m.status === 'mapped' ? 
                                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">OK ({m.matchType})</Badge> : 
                                                                <Badge variant="destructive">MANCANTE</Badge>
                                                            }
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="border rounded p-4">
                                        <h3 className="font-bold mb-3">Anteprima CSV (Raw)</h3>
                                        <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto max-h-96">
                                            {JSON.stringify(csvPreview, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: FINAL REPORT */}
                <TabsContent value="report">
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Analisi & Soluzioni</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            <h3>1. Configurazione Attuale (ImportModal.jsx)</h3>
                            <p>Il sistema cerca di mappare automaticamente le colonne CSV basandosi su "best match" tra il nome della colonna CSV e l'etichetta/chiave del campo DB.</p>
                            <ul>
                                <li>Campi critici attesi: <code>Nome, Cognome, Azienda, Telefono, Email, Città</code></li>
                                <li>Logica di match: Normalizza stringhe (rimuove spazi, lowercase) e controlla uguaglianza o inclusione.</li>
                            </ul>

                            <h3>2. Potenziali Problemi Rilevati</h3>
                            <Alert variant="warning" className="my-2">
                                <AlertTriangle className="h-4 w-4"/>
                                <AlertTitle>Case Sensitivity / Spazi</AlertTitle>
                                <AlertDescription>Se il CSV ha "Ragione Sociale" invece di "Azienda", o "Cellulare" invece di "Telefono", il match automatico potrebbe fallire o assegnare colonne errate.</AlertDescription>
                            </Alert>
                             <Alert variant="destructive" className="my-2">
                                <AlertTriangle className="h-4 w-4"/>
                                <AlertTitle>Date Malformate</AlertTitle>
                                <AlertDescription>Il parser delle date supporta formati ISO o DD/MM/YYYY. Se il CSV usa formati come "12-Gen-2023" o Excel Serial Numbers, l'importazione fallisce silenziosamente (valore null).</AlertDescription>
                            </Alert>

                            <h3>3. Soluzioni Consigliate</h3>
                            <ol>
                                <li><strong>Verifica CSV:</strong> Assicurarsi che l'intestazione del CSV corrisponda esattamente alle etichette visibili nel Passo 2 dell'importazione.</li>
                                <li><strong>Controllo Date:</strong> Assicurarsi che le colonne data nel CSV siano formattate come YYYY-MM-DD o DD/MM/YYYY.</li>
                                <li><strong>Mapping Manuale:</strong> Nel "Passo 2" dell'importazione, non fidarsi ciecamente dell'automazione. Controllare riga per riga che la colonna CSV di destra corrisponda al campo DB di sinistra.</li>
                            </ol>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ImportAnalysisTool;
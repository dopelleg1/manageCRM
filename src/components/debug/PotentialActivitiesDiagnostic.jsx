import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Wrench, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PotentialActivitiesDiagnostic = ({ onFixComplete }) => {
    const [loading, setLoading] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [stats, setStats] = useState(null);
    const { toast } = useToast();

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Call the Edge Function instead of client-side queries
            const { data, error } = await supabase.functions.invoke('check-potential-activities');

            if (error) throw error;
            if (!data.success) throw new Error(data.error || "Errore sconosciuto");

            setStats(data.stats);
        } catch (error) {
            console.error("Diagnostic error:", error);
            toast({ title: "Errore Diagnostica", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const runFixes = async () => {
        setFixing(true);
        try {
            const { data, error } = await supabase.functions.invoke('fix-potential-activities-types');

            if (error) throw error;
            if (!data.success) throw new Error(data.error || "Errore durante la correzione");

            toast({ 
                title: "Correzione Completata", 
                description: `Aggiornati: ${data.results.totalFixed} record.`, 
                variant: "success" 
            });
            
            await fetchStats();
            if (onFixComplete) onFixComplete();

        } catch (error) {
            console.error("Fix error:", error);
            toast({ title: "Errore Correzione", description: error.message, variant: "destructive" });
        } finally {
            setFixing(false);
        }
    };

    const hasIssues = stats?.breakdown.some(b => 
        !['acquirente', 'venditore'].includes(b.type)
    ) || stats?.nullOrEmpty > 0;

    if (loading && !stats) {
        return <div className="p-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Esecuzione diagnostica remota...</p>
        </div>;
    }

    return (
        <Card className="border-0 shadow-none">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                            Diagnostica Avanzata (Edge Function)
                        </CardTitle>
                        <CardDescription>Analisi completa lato server della tabella `potential_activities`</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading || fixing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Aggiorna
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded border text-center">
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Totale Record</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded border border-red-100 text-center">
                        <div className="text-2xl font-bold text-red-700">{stats?.nullOrEmpty || 0}</div>
                        <div className="text-xs text-red-600 uppercase tracking-wide">Tipo Mancante (NULL)</div>
                    </div>
                     <div className="p-4 bg-blue-50 rounded border border-blue-100 text-center">
                        <div className="text-2xl font-bold text-blue-700">
                             {stats?.breakdown.find(x => x.type === 'acquirente')?.count || 0}
                        </div>
                        <div className="text-xs text-blue-600 uppercase tracking-wide">Acquirenti</div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded border border-orange-100 text-center">
                        <div className="text-2xl font-bold text-orange-700">
                             {stats?.breakdown.find(x => x.type === 'venditore')?.count || 0}
                        </div>
                        <div className="text-xs text-orange-600 uppercase tracking-wide">Venditori</div>
                    </div>
                </div>

                {/* Issues Found */}
                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Valore 'Type' nel DB</TableHead>
                                <TableHead className="text-right">Conteggio</TableHead>
                                <TableHead>Stato</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats?.breakdown.map((item) => {
                                const isValid = ['acquirente', 'venditore'].includes(item.type);
                                return (
                                    <TableRow key={item.type}>
                                        <TableCell className="font-mono">{item.type || "(Vuoto)"}</TableCell>
                                        <TableCell className="text-right">{item.count}</TableCell>
                                        <TableCell>
                                            {isValid ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Corretto
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <AlertTriangle className="w-3 h-3 mr-1" /> Anomalia
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {stats?.nullOrEmpty > 0 && (
                                <TableRow>
                                    <TableCell className="font-mono text-red-600 italic">NULL / Empty</TableCell>
                                    <TableCell className="text-right text-red-600 font-bold">{stats.nullOrEmpty}</TableCell>
                                    <TableCell>
                                        <Badge variant="destructive">
                                            <AlertTriangle className="w-3 h-3 mr-1" /> Dati Mancanti
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Actions */}
                {hasIssues ? (
                    <Alert variant="destructive" className="bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Rilevati dati incongruenti</AlertTitle>
                        <AlertDescription className="mt-2">
                            Sono presenti record con valori non standard (es. 'seller', 'buyer', 'venditore_seller') o campi vuoti.
                            <div className="mt-4">
                                <Button onClick={runFixes} disabled={fixing} variant="destructive">
                                    {fixing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                                    Esegui correzione automatica (Edge Function)
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Database Pulito</AlertTitle>
                        <AlertDescription className="text-green-700">
                            Tutti i record utilizzano i valori standard 'acquirente' e 'venditore'.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default PotentialActivitiesDiagnostic;
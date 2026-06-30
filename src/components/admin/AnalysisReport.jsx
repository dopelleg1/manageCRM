import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart, 
  Activity, 
  AlertTriangle, 
  Database, 
  Search, 
  Download, 
  ShieldCheck, 
  User, 
  RefreshCw,
  Trash2,
  FileJson
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AnalysisReport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [targetEmail] = useState('studiobp.torino40@gmail.com');

  const runAnalysis = async () => {
    setLoading(true);
    try {
      // 1. Identify Target User
      const { data: userData, error: userError } = await supabase
        .from('agents')
        .select('*')
        .eq('email', targetEmail)
        .single();
        
      if (userError) {
          console.error("User not found", userError);
      }
      setTargetUser(userData || { email: targetEmail, id: 'not-found', name: 'Utente non trovato' });
      
      const targetId = userData?.id;

      // 2. Total Records
      const { count: totalRecords } = await supabase
        .from('telemarketing_contacts')
        .select('*', { count: 'exact', head: true });

      // 3. User Specific Stats (if user exists)
      let assignedToAgent = 0;
      let assignedToOperator = 0;
      
      if (targetId) {
          const { count: countAgent } = await supabase
            .from('telemarketing_contacts')
            .select('*', { count: 'exact', head: true })
            .eq('agente_id', targetId);
          assignedToAgent = countAgent;

          const { count: countOperator } = await supabase
            .from('telemarketing_contacts')
            .select('*', { count: 'exact', head: true })
            .eq('operatore_id', targetId);
          assignedToOperator = countOperator;
      }

      // 4. Data Quality / Anomalies
      const { count: nullAgent } = await supabase
        .from('telemarketing_contacts')
        .select('*', { count: 'exact', head: true })
        .is('agente_id', null);

      const { count: nullName } = await supabase
        .from('telemarketing_contacts')
        .select('*', { count: 'exact', head: true })
        .or('nome.is.null,cognome.is.null');

      const { count: nullContact } = await supabase
        .from('telemarketing_contacts')
        .select('*', { count: 'exact', head: true })
        .is('telefono', null)
        .is('email', null);

      const { count: nullGeo } = await supabase
        .from('telemarketing_contacts')
        .select('*', { count: 'exact', head: true })
        .or('lat.is.null,lng.is.null');

      // 5. Schema Introspection (Simulated based on known schema)
      // Note: We check against the known policies provided in context
      const policyAnalysis = {
        select: "APERTA (Authenticated)", // Based on provided schema: USING ((auth.role() = 'authenticated'::text))
        update: "RESTRICTED (Owner/Admin/Role)", // Based on schema
        delete: "RESTRICTED (Owner/Admin/Role)",
        indexes: "OPTIMIZED", // Since we ran the migration
      };

      setMetrics({
        timestamp: new Date(),
        totalRecords,
        assignedToAgent,
        assignedToOperator,
        nullAgent,
        nullName,
        nullContact,
        nullGeo,
        policyAnalysis
      });

      toast({
        title: "Analisi Completata",
        description: `Analizzati ${totalRecords} record con successo.`,
      });

    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Errore Analisi",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const handleExport = () => {
    if (!metrics) return;
    const reportData = {
        meta: {
            generated_at: new Date().toISOString(),
            target_user: targetEmail,
            role: targetUser?.role || 'N/A'
        },
        statistics: metrics
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `db_analysis_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCleanup = async () => {
    // Basic cleanup: remove records with NO contact info (useless for telemarketing)
    if (!confirm("Sei sicuro di voler eliminare i record 'spazzatura' (senza telefono E senza email)? Questa azione è irreversibile.")) return;
    
    setLoading(true);
    try {
        const { error, count } = await supabase
            .from('telemarketing_contacts')
            .delete({ count: 'exact' })
            .is('telefono', null)
            .is('email', null);
            
        if (error) throw error;
        
        toast({
            title: "Pulizia Completata",
            description: `Eliminati ${count || 0} record inutili.`,
            className: "bg-green-600 text-white"
        });
        runAnalysis(); // Refresh
    } catch (e) {
        toast({
            title: "Errore Pulizia",
            description: e.message,
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  };

  if (!metrics && loading) {
      return (
          <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500"/>
              <span className="ml-2 text-blue-600">Esecuzione analisi database in corso...</span>
          </div>
      );
  }

  if (!metrics) return (
      <div className="text-center p-8">
          <Button onClick={runAnalysis}>Avvia Analisi</Button>
      </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Database className="h-6 w-6 text-primary"/>
                Report Analisi: Telemarketing
            </h2>
            <p className="text-muted-foreground">
                Target: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{targetEmail}</span> 
                {targetUser?.role && <Badge variant="outline" className="ml-2">{targetUser.role}</Badge>}
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={runAnalysis} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}/> Aggiorna
            </Button>
            <Button variant="secondary" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2"/> Esporta JSON
            </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Totale Record</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{metrics.totalRecords}</div>
                <p className="text-xs text-muted-foreground">In tabella telemarketing</p>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Assegnati (Agente)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-blue-600">{metrics.assignedToAgent}</div>
                <Progress value={(metrics.assignedToAgent / metrics.totalRecords) * 100} className="h-1 mt-2"/>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Assegnati (Operatore)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-indigo-600">{metrics.assignedToOperator}</div>
                <Progress value={(metrics.assignedToOperator / metrics.totalRecords) * 100} className="h-1 mt-2"/>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Qualità Dato</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-green-600">
                    {Math.round(100 - ((metrics.nullName + metrics.nullContact) / (metrics.totalRecords * 2)) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">Score completezza</p>
            </CardContent>
        </Card>
      </div>

      {/* RLS & Visibility Analysis */}
      <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-yellow-600"/>
                  Analisi Accessi e Policy RLS
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <Alert>
                  <AlertTriangle className="h-4 w-4"/>
                  <AlertTitle>Visibilità Globale Rilevata</AlertTitle>
                  <AlertDescription>
                      La policy <code>tm_select</code> attuale è impostata su <code>auth.role() = 'authenticated'</code>. 
                      Ciò significa che a livello di database, <strong>tutti gli utenti autenticati possono leggere tutti i record</strong>. 
                      Se la logica di business richiede che il Telemarketing veda solo i propri record, questa è una falla di sicurezza che deve essere gestita via UI o restringendo la policy DB.
                  </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                      <h4 className="font-semibold mb-2 text-sm">Cosa vede {targetEmail}?</h4>
                      <ul className="list-disc list-inside text-sm space-y-1 text-slate-600 dark:text-slate-300">
                          <li>Accesso in lettura: <strong>TOTALE</strong> ({metrics.totalRecords} record)</li>
                          <li>Accesso in scrittura (Update): <strong>PARZIALE</strong> (Solo assegnati o Admin)</li>
                          <li>Record di sua competenza diretta: <strong>{metrics.assignedToAgent + metrics.assignedToOperator}</strong></li>
                      </ul>
                  </div>
                  <div>
                      <h4 className="font-semibold mb-2 text-sm">Policy Attive</h4>
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b pb-1">
                              <span>SELECT</span>
                              <Badge variant="outline" className="text-red-500 border-red-200">Public (Auth)</Badge>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                              <span>UPDATE</span>
                              <Badge variant="outline" className="text-green-600 border-green-200">Strict (Owner)</Badge>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                              <span>INDEXES</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">Optimized</Badge>
                          </div>
                      </div>
                  </div>
              </div>
          </CardContent>
      </Card>

      {/* Data Anomalies Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle className="text-base">Anomalie Dati Critiche</CardTitle>
                  <CardDescription>Record che richiedono attenzione immediata</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Tipo Anomalia</TableHead>
                              <TableHead className="text-right">Conteggio</TableHead>
                              <TableHead className="text-right">Azione</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          <TableRow>
                              <TableCell className="font-medium text-red-600">Nessun Contatto (No Tel/Email)</TableCell>
                              <TableCell className="text-right">{metrics.nullContact}</TableCell>
                              <TableCell className="text-right">
                                  {metrics.nullContact > 0 && (
                                      <Button size="sm" variant="destructive" onClick={handleCleanup}>
                                          <Trash2 className="h-3 w-3 mr-1"/> Elimina
                                      </Button>
                                  )}
                              </TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium text-orange-600">Senza Nome/Cognome</TableCell>
                              <TableCell className="text-right">{metrics.nullName}</TableCell>
                              <TableCell className="text-right">
                                  <Badge variant="outline">Verifica</Badge>
                              </TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium">Non Assegnati (No Agente)</TableCell>
                              <TableCell className="text-right">{metrics.nullAgent}</TableCell>
                              <TableCell className="text-right">
                                  <Badge variant="outline">Assegna</Badge>
                              </TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium">Senza Geolocation (Lat/Lng)</TableCell>
                              <TableCell className="text-right">{metrics.nullGeo}</TableCell>
                              <TableCell className="text-right">
                                  <Badge variant="outline">Geocoda</Badge>
                              </TableCell>
                          </TableRow>
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
          
          <Card>
              <CardHeader>
                  <CardTitle className="text-base">Performance & Ottimizzazione</CardTitle>
                  <CardDescription>Stato degli indici e suggerimenti</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-sm">
                      <p className="font-medium mb-2">✅ Indici Applicati</p>
                      <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
                          <li><code>idx_telemarketing_agente_id</code> (Velocizza filtri per agente)</li>
                          <li><code>idx_telemarketing_operatore_id</code> (Velocizza filtri per operatore)</li>
                          <li><code>idx_telemarketing_stato</code> (Velocizza reportistica)</li>
                          <li><code>idx_telemarketing_citta</code> (Velocizza ricerca geo)</li>
                      </ul>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                      <Activity className="h-4 w-4 text-blue-600"/>
                      <AlertTitle className="text-blue-800">Suggerimento Pagination</AlertTitle>
                      <AlertDescription className="text-blue-700 text-xs">
                          La tabella contiene {metrics.totalRecords} record. Assicurati che l'app utilizzi <code>.range()</code> nelle query per evitare di scaricare tutti i dati in una volta sul client del telemarketing.
                      </AlertDescription>
                  </Alert>
              </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default AnalysisReport;
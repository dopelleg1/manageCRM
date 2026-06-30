import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Download, Upload, Server, ShieldCheck, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase as devClient } from '@/lib/customSupabaseClient';
import { createClient } from '@supabase/supabase-js';
import { testConnection } from '@/utils/migration/ConnectionTest';
import { exportData, importData } from '@/utils/migration/DataMigrationHelper';
import { verifyMigration } from '@/utils/migration/VerificationHelper';

// Target production URL for extracting data from
const oldSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const oldSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const MigrationSetupPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportedData, setExportedData] = useState(null);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, type }]);
  };

  const getOldClient = () => {
    if (!oldSupabaseUrl || !oldSupabaseKey) {
      toast({ title: "Missing Source Credentials", description: "Cannot find production credentials in environment variables.", variant: "destructive" });
      return null;
    }
    return createClient(oldSupabaseUrl, oldSupabaseKey);
  };

  const handleTestConnection = async () => {
    setLoading(true);
    addLog('Starting connection test to DEV instance...', 'info');
    const { success, results } = await testConnection();
    if (success) {
      addLog(`Connection tests completed. Connected: ${results.connected}`, results.connected ? 'success' : 'error');
      results.details.forEach(d => addLog(d, d.includes('PASS') ? 'success' : 'error'));
      toast({ title: "Test Complete", description: "Check logs for details." });
    } else {
      addLog('Connection test failed entirely.', 'error');
    }
    setLoading(false);
  };

  const handleExportData = async () => {
    const oldClient = getOldClient();
    if (!oldClient) return;
    
    setLoading(true);
    addLog('Initiating data export from SOURCE...', 'info');
    try {
      const { success, data } = await exportData(oldClient, (msg) => addLog(msg, 'info'));
      if (success) {
        setExportedData(data);
        addLog('Data export successful. Data stored in memory.', 'success');
        toast({ title: "Export Complete", description: "Data is ready for import." });
      }
    } catch (err) {
      addLog(`Export failed: ${err.message}`, 'error');
    }
    setLoading(false);
  };

  const handleImportData = async () => {
    if (!exportedData) {
      toast({ title: "No Data", description: "Please export data first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    addLog('Initiating data import to TARGET (DEV)...', 'info');
    try {
      const { success, results } = await importData(devClient, exportedData, (msg) => addLog(msg, 'info'));
      if (success) {
        addLog('Data import successful.', 'success');
        toast({ title: "Import Complete", description: "Data has been migrated to dev environment." });
      }
    } catch (err) {
      addLog(`Import failed: ${err.message}`, 'error');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    const oldClient = getOldClient();
    if (!oldClient) return;
    setLoading(true);
    addLog('Initiating verification checks...', 'info');
    try {
      const { success, report } = await verifyMigration(oldClient, devClient, (msg) => addLog(msg, 'info'));
      if (success) {
        addLog(`Verification complete. Data Match: ${report.dataMatch}`, report.dataMatch ? 'success' : 'error');
      }
    } catch (err) {
      addLog(`Verification failed: ${err.message}`, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dev Environment Migration Setup</h1>
          <p className="text-muted-foreground mt-2">Manage data migration to <span className="font-semibold text-primary">dev.studiobpitalia.it</span></p>
        </div>
        <Badge variant="destructive" className="text-sm px-4 py-1">DEVELOPMENT ONLY</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Server className="w-5 h-5" /> Target Server Status</CardTitle>
            <CardDescription>Verify DEV instance connectivity (nhrhjdjfjrsghqmwoewn)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleTestConnection} disabled={loading} className="w-full">
              <Activity className="w-4 h-4 mr-2" /> Test Connection
            </Button>
            <Button onClick={handleVerify} disabled={loading} variant="outline" className="w-full">
              <ShieldCheck className="w-4 h-4 mr-2" /> Verify Parity
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Data Transfer</CardTitle>
            <CardDescription>Move data to isolated environment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={handleExportData} disabled={loading} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
              <Button onClick={handleImportData} disabled={loading || !exportedData} className="w-full">
                <Upload className="w-4 h-4 mr-2" /> Import
              </Button>
            </div>
            {exportedData && (
               <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-200">
                <CheckCircle2 className="w-4 h-4" /> Ready in memory
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>Import writes directly to dev instance. Run only after Supabase schema push.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Logs</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border bg-black text-green-400 p-4 font-mono text-sm">
            {logs.length === 0 ? (
              <span className="text-gray-500">Waiting for actions...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  <span className="text-gray-500">[{log.time}]</span>{' '}
                  <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-blue-400'}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationSetupPage;
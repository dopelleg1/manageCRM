import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/customSupabaseClient';
import { SchemaExportImport } from '@/utils/migration/SchemaExportImport';
import { DataMigrationUtility } from '@/utils/migration/DataMigrationUtility';
import { MigrationVerification } from '@/utils/migration/MigrationVerification';
import { Download, Upload, Database, CheckCircle, AlertTriangle, FileText, Activity } from 'lucide-react';

const MigrationControlPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [logs, setLogs] = useState([]);
  const [connectionInfo, setConnectionInfo] = useState({});
  const [exportedDataCounts, setExportedDataCounts] = useState(null);

  useEffect(() => {
    setConnectionInfo({
      url: supabase.supabaseUrl,
      status: "Connected"
    });
  }, []);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleExportSchema = () => {
    const result = SchemaExportImport.exportSchema();
    addLog("Generated Schema SQL Migration script.");
    
    const blob = new Blob([result.sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema_migration.sql';
    a.click();

    toast({ title: "Schema Exported", description: "SQL file downloaded successfully." });
  };

  const handleExportData = async () => {
    setLoading(true);
    addLog("Starting Data Export...");
    try {
      const result = await DataMigrationUtility.exportData((msg) => {
        setProgress(msg);
      });
      
      result.report.logs.forEach(addLog);
      setExportedDataCounts(result.report.counts);
      
      const a = document.createElement('a');
      a.href = result.url;
      a.download = 'database_export.json';
      a.click();
      
      toast({ title: "Data Exported", description: "JSON file downloaded successfully." });
    } catch (err) {
      addLog(`Error exporting data: ${err.message}`);
      toast({ variant: "destructive", title: "Export Failed", description: err.message });
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleVerifyMigration = async () => {
    setLoading(true);
    addLog("Running Verification Checks...");
    try {
      const report = await MigrationVerification.runVerification(exportedDataCounts);
      addLog(`Verification complete. Status: ${report.overallStatus}`);
      Object.entries(report.tables).forEach(([table, data]) => {
        addLog(`- ${table}: ${data.status} (Count: ${data.count})`);
      });
      toast({ title: "Verification Complete", description: `Overall Status: ${report.overallStatus}` });
    } catch (err) {
      addLog(`Error during verification: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Migration Control Panel</h1>
          <p className="text-muted-foreground">Manage and verify database migrations to new instances.</p>
        </div>
      </div>

      <Alert>
        <Activity className="h-4 w-4" />
        <AlertTitle>Current Connection</AlertTitle>
        <AlertDescription className="font-mono mt-2">
          URL: {connectionInfo.url}<br/>
          Status: <span className="text-green-600 font-semibold">{connectionInfo.status}</span>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList>
              <TabsTrigger value="tasks">Migration Tasks</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/> 1. Schema Migration</CardTitle>
                  <CardDescription>Export table structures, policies, and functions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This step generates a standard SQL script that you must run manually in the new Supabase SQL Editor.
                  </p>
                  <Button onClick={handleExportSchema} disabled={loading}>
                    <Download className="mr-2 h-4 w-4" /> Export Schema SQL
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5"/> 2. Data Migration</CardTitle>
                  <CardDescription>Export all table data into a comprehensive JSON file.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportData} disabled={loading}>
                    <Download className="mr-2 h-4 w-4" /> Export Database JSON
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="verification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5"/> System Verification</CardTitle>
                  <CardDescription>Verify that the new database matches the old database structure and counts.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleVerifyMigration} disabled={loading} variant="secondary">
                    <Activity className="mr-2 h-4 w-4" /> Run Verification Checks
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Migration Logs</CardTitle>
              <CardDescription>Live execution logs</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {progress && (
                <div className="mb-4 text-sm font-medium text-blue-600 flex items-center gap-2 animate-pulse">
                  <Activity className="h-4 w-4" /> {progress}
                </div>
              )}
              <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/50">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-sm italic">No logs yet.</div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, i) => (
                      <div key={i} className="text-xs font-mono break-all pb-1 border-b border-border/50 last:border-0">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MigrationControlPanel;
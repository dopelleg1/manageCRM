import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Loader2, Play, Trash2 } from 'lucide-react';
import { createCompleteBackup, getBackupsList } from '@/services/BackupManagementService';
import { useToast } from '@/components/ui/use-toast';

const DebugBackupFlow = ({ onComplete }) => {
    const { toast } = useToast();
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const scrollRef = useRef(null);
    
    const [steps, setSteps] = useState([
        { id: 1, name: 'Create via Edge Function (Step 1 & 2)', status: 'idle' },
        { id: 2, name: 'Verify Database Record (Step 3)', status: 'idle' },
        { id: 3, name: 'Reload Backups List (Step 4)', status: 'idle' },
        { id: 4, name: 'Update UI State (Step 5)', status: 'idle' }
    ]);

    const addLog = (msg) => {
        const timestamp = new Date().toISOString();
        setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const updateStep = (id, status) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const runSimulation = async () => {
        setIsRunning(true);
        setLogs([]);
        setSteps(steps.map(s => ({ ...s, status: 'idle' })));
        
        try {
            // Steps 1, 2, 3
            updateStep(1, 'running');
            addLog("Starting full debug simulation...");
            
            // We intercept the logger from the service to update our local steps
            const serviceLogger = (msg) => {
                addLog(msg);
                if (msg.includes("[Step 3]")) {
                    updateStep(1, 'success');
                    updateStep(2, 'running');
                }
                if (msg.includes("[Error")) {
                    if (msg.includes("Step 1") || msg.includes("Step 2")) updateStep(1, 'error');
                    if (msg.includes("Step 3")) updateStep(2, 'error');
                    if (msg.includes("Step 4")) updateStep(3, 'error');
                }
                if (msg.includes("[Success - Step 3]")) updateStep(2, 'success');
                if (msg.includes("[Warning - Step 3]")) updateStep(2, 'error'); // Treat warning as error in strict debug
            };

            await createCompleteBackup(serviceLogger);
            
            // Step 4
            updateStep(3, 'running');
            const backups = await getBackupsList(serviceLogger);
            if (backups) {
                updateStep(3, 'success');
            } else {
                updateStep(3, 'error');
            }

            // Step 5
            updateStep(4, 'running');
            addLog(`[Step 5] Triggering UI state update via onComplete callback with ${backups.length} items...`);
            if (backups.length === 0) addLog("[Step 5] Empty list returned to UI.");
            
            if (onComplete) {
                onComplete();
                addLog("[Step 5] UI update callback executed.");
                updateStep(4, 'success');
            } else {
                addLog("[Error - Step 5] No onComplete callback provided.");
                updateStep(4, 'error');
            }

            toast({ title: "Simulation Complete", description: "Check logs for details.", variant: "success" });
        } catch (error) {
            addLog(`[Fatal] Simulation aborted due to error: ${error.message}`);
            toast({ title: "Simulation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'running': return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
            case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
            default: return <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-700" />;
        }
    };

    return (
        <Card className="border-blue-200 dark:border-blue-900 shadow-md mb-6 bg-slate-50 dark:bg-slate-900/50">
            <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <Play className="h-5 w-5" />
                        Debug Backup Flow Simulation
                    </CardTitle>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setLogs([])} disabled={isRunning}>
                            <Trash2 className="h-4 w-4 mr-2" /> Clear Logs
                        </Button>
                        <Button size="sm" onClick={runSimulation} disabled={isRunning} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                            Run Full Simulation
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Execution Steps</h4>
                    <div className="space-y-3">
                        {steps.map((step) => (
                            <div key={step.id} className="flex items-center gap-3 p-3 rounded-md bg-white dark:bg-slate-950 border">
                                {getStatusIcon(step.status)}
                                <span className={`font-medium ${step.status === 'running' ? 'text-blue-600' : ''}`}>
                                    {step.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-4 flex flex-col h-full">
                    <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Real-time Logs</h4>
                    <ScrollArea className="flex-1 min-h-[250px] bg-black text-green-400 p-4 rounded-md font-mono text-xs overflow-auto" ref={scrollRef}>
                        {logs.length === 0 ? (
                            <div className="text-slate-600 italic">No logs yet. Click 'Run Full Simulation' to begin.</div>
                        ) : (
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className={log.includes('[Error') || log.includes('[Fatal') ? 'text-red-400' : log.includes('[Warning') ? 'text-yellow-400' : log.includes('[Success') ? 'text-green-300' : 'text-slate-300'}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
};

export default DebugBackupFlow;
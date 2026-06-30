import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, HardDrive, FileText, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculateSupabaseCost } from '@/utils/costCalculationService';

const DatabaseCostAnalysis = () => {
    const { toast } = useToast();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Call RPC function 'get_table_stats' which was provided in db schema
                const { data, error } = await supabase.rpc('get_table_stats');
                
                if (error) throw error;
                
                if (data) {
                    // Sort by size bytes descending
                    const sortedData = [...data].sort((a, b) => b.size_bytes - a.size_bytes);
                    setStats(sortedData);
                }
            } catch (err) {
                console.error("Error fetching db stats:", err);
                toast({
                    title: "Analisi Fallita",
                    description: "Impossibile recuperare le statistiche del database. Verifica i permessi RPC.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [toast]);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const totalSizeBytes = stats.reduce((acc, table) => acc + (table.size_bytes || 0), 0);
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    const totalRecords = stats.reduce((acc, table) => acc + (table.record_count || 0), 0);
    
    // Estimate Storage Cost (Assuming 1MB DB size corresponds to minimal usage, but we pad it to show logic)
    // We pass totalSizeMB converted to GB (very small). Let's simulate some file storage for reality check.
    const estimatedFileStorageGB = 12; // Simulated: Docs, images
    const currentCost = calculateSupabaseCost(estimatedFileStorageGB, 1000000, 20);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Total DB Size (Relational)</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSizeMB} MB</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Est. Monthly Base Cost</CardTitle>
                        <Database className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">${currentCost}</div>
                        <p className="text-xs text-muted-foreground">Includes est. 12GB blob storage</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Tables by Storage Size</CardTitle>
                    <CardDescription>Analysis of the public schema data footprint.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Table Name</TableHead>
                                <TableHead className="text-right">Record Count</TableHead>
                                <TableHead className="text-right">Size (KB)</TableHead>
                                <TableHead className="text-right">Columns</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.slice(0, 10).map((table, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {table.table_name}
                                            {i < 3 && <Badge variant="destructive" className="text-[10px] h-5">Heavy</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{table.record_count?.toLocaleString() || 0}</TableCell>
                                    <TableCell className="text-right">
                                        {table.size_bytes ? (table.size_bytes / 1024).toFixed(2) : 0}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline">{table.columns?.length || 0}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default DatabaseCostAnalysis;
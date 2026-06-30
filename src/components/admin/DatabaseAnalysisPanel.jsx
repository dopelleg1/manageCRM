import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, Download, Copy, Database, Server, Cloud } from 'lucide-react';
import DatabaseAnalysisTable from './DatabaseAnalysisTable';
import StorageAnalysisTable from './StorageAnalysisTable';
import CloudStorageAnalysisTable from './CloudStorageAnalysisTable';
import CloudStorageFoldersTable from './CloudStorageFoldersTable';
import CloudStorageFilesTable from './CloudStorageFilesTable';
import CloudStorageFilters from './CloudStorageFilters';
import CloudStorageCharts from './CloudStorageCharts';

const DatabaseAnalysisPanel = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [dbData, setDbData] = useState([]);
    const [storageData, setStorageData] = useState([]);
    const [cloudData, setCloudData] = useState({ stats: null, folders: [], files: [] });
    const [lastAnalyzed, setLastAnalyzed] = useState(null);

    // Cloud Storage Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [folderFilter, setFolderFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('date_desc');

    const runAnalysis = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // 1. Run DB Analysis
            const dbResponse = await supabase.functions.invoke('analyze-database', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (dbResponse.error) throw new Error(`Database Error: ${dbResponse.error.message}`);
            setDbData(dbResponse.data?.data || []);

            // 2. Run basic Storage Analysis (legacy)
            const storageResponse = await supabase.functions.invoke('analyze-storage', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (storageResponse.error) throw new Error(`Storage Error: ${storageResponse.error.message}`);
            setStorageData(storageResponse.data?.data || []);

            // 3. Run new Cloud Storage Analysis
            const cloudResponse = await supabase.functions.invoke('analyze-cloud-storage', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (cloudResponse.error) throw new Error(`Cloud Storage Error: ${cloudResponse.error.message}`);
            if (cloudResponse.data?.success) {
                setCloudData(cloudResponse.data.data);
            }

            setLastAnalyzed(new Date().toISOString());

            toast({
                title: "Analisi Completata",
                description: "L'analisi completa del sistema è stata completata con successo.",
                variant: "success"
            });
        } catch (error) {
            console.error("Analysis Error:", error);
            toast({
                title: "Errore Analisi",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const getReportObject = () => {
        return {
            metadata: {
                generated_at: new Date().toISOString(),
                environment: "Production"
            },
            database: {
                total_tables: dbData.length,
                tables: dbData
            },
            storage: {
                total_files: storageData.length,
                files: storageData
            },
            cloud_storage: {
                stats: cloudData.stats,
                folders: cloudData.folders
            }
        };
    };

    const handleExport = () => {
        if (!lastAnalyzed) return;
        
        const report = getReportObject();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system_analysis_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        if (!lastAnalyzed) return;
        
        const report = getReportObject();
        navigator.clipboard.writeText(JSON.stringify(report, null, 2))
            .then(() => toast({ title: "Copiato", description: "Report copiato negli appunti." }))
            .catch(() => toast({ title: "Errore", description: "Impossibile copiare negli appunti.", variant: "destructive" }));
    };

    // Filter and Sort Cloud Files
    const filteredFiles = useMemo(() => {
        if (!cloudData.files) return [];
        let result = [...cloudData.files];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(f => f.name.toLowerCase().includes(term));
        }
        if (filterType !== 'all') {
            result = result.filter(f => f.category === filterType);
        }
        if (folderFilter !== 'all') {
            result = result.filter(f => {
                const folderName = f.path.replace(`/${f.name}`, '') || '(root)';
                return folderName === folderFilter;
            });
        }

        result.sort((a, b) => {
            switch (sortOrder) {
                case 'date_asc': return new Date(a.created_at) - new Date(b.created_at);
                case 'date_desc': return new Date(b.created_at) - new Date(a.created_at);
                case 'size_asc': return a.size - b.size;
                case 'size_desc': return b.size - a.size;
                case 'name_asc': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });

        return result;
    }, [cloudData.files, searchTerm, filterType, folderFilter, sortOrder]);


    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 bg-slate-50 dark:bg-slate-900/50 gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-indigo-500" /> 
                        Analisi Globale Sistema
                    </CardTitle>
                    <CardDescription>
                        Scansiona il database e lo storage per monitorare dimensioni e conteggi.
                        {lastAnalyzed && <span className="ml-2 block mt-1 text-xs text-indigo-600 dark:text-indigo-400">Ultima analisi: {new Date(lastAnalyzed).toLocaleString('it-IT')}</span>}
                    </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {lastAnalyzed && (
                        <>
                            <Button variant="outline" size="sm" onClick={handleCopy} disabled={loading} className="flex-1 sm:flex-none">
                                <Copy className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Copia negli Appunti</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="flex-1 sm:flex-none">
                                <Download className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Scarica Report Completo</span>
                            </Button>
                        </>
                    )}
                    <Button onClick={runAnalysis} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                        Avvia Analisi Completa
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <Tabs defaultValue="database" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-6">
                        <TabsTrigger value="database" className="flex items-center gap-2">
                            <Database className="h-4 w-4" /> Database SQL
                        </TabsTrigger>
                        <TabsTrigger value="cloud_storage" className="flex items-center gap-2">
                            <Cloud className="h-4 w-4 text-sky-500" /> Cloud Storage
                        </TabsTrigger>
                        <TabsTrigger value="storage" className="flex items-center gap-2">
                            <Server className="h-4 w-4" /> Log Storage
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="database">
                        <DatabaseAnalysisTable data={dbData} />
                    </TabsContent>
                    
                    <TabsContent value="cloud_storage" className="space-y-6">
                        {cloudData.stats ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <CloudStorageAnalysisTable stats={cloudData.stats} />
                                <CloudStorageCharts stats={cloudData.stats} folders={cloudData.folders} />
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1">
                                        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Esplora Cartelle</h3>
                                        <CloudStorageFoldersTable folders={cloudData.folders} />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Ricerca File</h3>
                                        <CloudStorageFilters 
                                            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                                            filterType={filterType} setFilterType={setFilterType}
                                            sortOrder={sortOrder} setSortOrder={setSortOrder}
                                            folders={cloudData.folders}
                                            folderFilter={folderFilter} setFolderFilter={setFolderFilter}
                                        />
                                        <CloudStorageFilesTable files={filteredFiles} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                                <Cloud className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>Nessun dato Cloud Storage disponibile.</p>
                                <p className="text-sm mt-1">Clicca su "Avvia Analisi Completa" per caricare i dati.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="storage">
                        <StorageAnalysisTable data={storageData} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default DatabaseAnalysisPanel;
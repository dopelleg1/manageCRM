import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Database, TrendingDown, ArrowRightLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DatabaseCostAnalysis from '@/components/admin/DatabaseCostAnalysis';
import QueryPerformanceAnalysis from '@/components/admin/QueryPerformanceAnalysis';
import MigrationAlternativesAnalysis from '@/components/admin/MigrationAlternativesAnalysis';
import MigrationRoadmap from '@/components/admin/MigrationRoadmap';
import CostOptimizationTips from '@/components/admin/CostOptimizationTips';

const DatabaseDiagnosticsPage = () => {
    
    const exportReport = () => {
        const report = {
            generated_at: new Date().toISOString(),
            status: "Complete",
            recommendation: "Stay on Supabase, implement DataContext optimizations."
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "db-diagnostic-report.json";
        a.click();
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in zoom-in duration-300">
            <Helmet>
                <title>Database Diagnostics - CRM</title>
            </Helmet>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Database className="h-8 w-8 text-primary" />
                        Database Diagnostics & Costs
                    </h1>
                    <p className="text-muted-foreground mt-1">Comprehensive analysis of storage footprint, performance, and migration paths.</p>
                </div>
                <Button onClick={exportReport} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export JSON Report
                </Button>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                    <TabsTrigger value="overview" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Database className="h-4 w-4 mr-2" />
                        Storage & Stats
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Activity className="h-4 w-4 mr-2" />
                        Query Perf.
                    </TabsTrigger>
                    <TabsTrigger value="alternatives" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Compare Options
                    </TabsTrigger>
                    <TabsTrigger value="roadmap" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Database className="h-4 w-4 mr-2" />
                        Migration Paths
                    </TabsTrigger>
                    <TabsTrigger value="optimization" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <TrendingDown className="h-4 w-4 mr-2" />
                        Cost Savings
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview">
                        <DatabaseCostAnalysis />
                    </TabsContent>
                    
                    <TabsContent value="performance">
                        <QueryPerformanceAnalysis />
                    </TabsContent>
                    
                    <TabsContent value="alternatives">
                        <MigrationAlternativesAnalysis />
                    </TabsContent>
                    
                    <TabsContent value="roadmap">
                        <MigrationRoadmap />
                    </TabsContent>
                    
                    <TabsContent value="optimization">
                        <CostOptimizationTips />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default DatabaseDiagnosticsPage;
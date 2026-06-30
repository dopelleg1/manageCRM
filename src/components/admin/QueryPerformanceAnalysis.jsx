import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Database, Zap, RefreshCw } from 'lucide-react';

const QueryPerformanceAnalysis = () => {
    // Static analysis based on known application logic
    const expensiveQueries = [
        {
            component: 'DataContext.jsx (Initial Load)',
            query: 'SELECT * FROM telemarketing_contacts ORDER BY created_at DESC LIMIT 1000',
            impact: 'High',
            reason: 'Full table scan without targeted indexing, large payload transfer over network.',
            solution: 'Implement server-side pagination (limit/offset) instead of fetching all records into context.'
        },
        {
            component: 'CalendarPage.jsx',
            query: 'SELECT * FROM appointments WHERE agente_id = ?',
            impact: 'Medium',
            reason: 'Fetches all historical appointments instead of just the current month.',
            solution: 'Add a date range filter (.gte and .lte) to the appointments query based on current calendar view.'
        },
        {
            component: 'MapPage.jsx',
            query: 'SELECT lat, lng, type FROM potential_activities',
            impact: 'High',
            reason: 'Downloads entire coordinate dataset for all potentials on every mount.',
            solution: 'Use PostGIS extensions for bounding box queries based on current map viewport.'
        },
        {
            component: 'Search Bar',
            query: 'ILIKE operations across multiple text fields',
            impact: 'Medium',
            reason: 'Sequential scans on text fields without pg_trgm indexes.',
            solution: 'Create GIN indexes on frequently searched columns (nome, cognome, telefono).'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Estimated Daily Reads</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">~45,000</div>
                        <p className="text-xs text-muted-foreground">Due to heavy initial DataContext load</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Estimated Daily Writes</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">~1,200</div>
                        <p className="text-xs text-muted-foreground">New records & assignments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Realtime Subscriptions</CardTitle>
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0 Active</div>
                        <p className="text-xs text-muted-foreground">App currently uses polling/manual refresh</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Query Optimization Targets
                    </CardTitle>
                    <CardDescription>Identified bottlenecks in current application logic and recommended fixes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Component / Feature</TableHead>
                                <TableHead>Impact</TableHead>
                                <TableHead>Bottleneck Reason</TableHead>
                                <TableHead>Recommended Solution</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expensiveQueries.map((q, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium whitespace-nowrap">{q.component}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            q.impact === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {q.impact}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm max-w-xs">{q.reason}</TableCell>
                                    <TableCell className="text-sm max-w-xs">{q.solution}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default QueryPerformanceAnalysis;
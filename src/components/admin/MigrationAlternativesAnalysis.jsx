import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateSupabaseCost, calculateFirebaseCost, calculateMongoDBCost, calculatePlanetScaleCost, calculateTursoCost, calculateRailwayCost, calculateRenderCost } from '@/utils/costCalculationService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';

const MigrationAlternativesAnalysis = () => {
    // Simulated current usage for comparison
    const usage = {
        storageGB: 15, // Over 8GB Supabase limit
        monthlyApiCalls: 2500000,
        bandwidthGB: 50,
        monthlyReads: 2000000, // Firestore equiv
        monthlyWrites: 500000 // Firestore equiv
    };

    const costData = [
        {
            provider: 'Supabase (Current)',
            cost: calculateSupabaseCost(usage.storageGB, usage.monthlyApiCalls, usage.bandwidthGB),
            type: 'BaaS',
            difficulty: '0/10'
        },
        {
            provider: 'Firebase',
            cost: calculateFirebaseCost(usage.storageGB, usage.monthlyReads, usage.monthlyWrites),
            type: 'BaaS',
            difficulty: '9/10'
        },
        {
            provider: 'MongoDB Atlas',
            cost: calculateMongoDBCost(usage.storageGB, usage.monthlyApiCalls),
            type: 'NoSQL DB',
            difficulty: '8/10'
        },
        {
            provider: 'PlanetScale',
            cost: calculatePlanetScaleCost(usage.monthlyReads, usage.monthlyWrites),
            type: 'SQL DB',
            difficulty: '7/10'
        },
        {
            provider: 'Turso',
            cost: calculateTursoCost(usage.monthlyApiCalls),
            type: 'SQL DB',
            difficulty: '6/10'
        },
        {
            provider: 'Railway (Postgres)',
            cost: calculateRailwayCost(730, usage.storageGB),
            type: 'Managed DB',
            difficulty: '10/10 (Requires Backend)'
        },
        {
            provider: 'Render (Postgres)',
            cost: calculateRenderCost(730, usage.storageGB),
            type: 'Managed DB',
            difficulty: '10/10 (Requires Backend)'
        }
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Estimated Monthly Costs Comparison</CardTitle>
                    <CardDescription>Based on {usage.storageGB}GB Storage and {usage.monthlyApiCalls.toLocaleString()} monthly operations.</CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="provider" angle={-45} textAnchor="end" height={80} />
                            <YAxis tickFormatter={(val) => `$${val}`} />
                            <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
                            <Bar dataKey="cost" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Monthly Cost ($)" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Migration Matrix</CardTitle>
                    <CardDescription>Feature compatibility and migration effort.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Provider</TableHead>
                                <TableHead>Cost/mo</TableHead>
                                <TableHead>Data Model</TableHead>
                                <TableHead>Auth/RLS Built-in?</TableHead>
                                <TableHead>Realtime?</TableHead>
                                <TableHead>Migration Effort</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {costData.map((data, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{data.provider}</TableCell>
                                    <TableCell>${data.cost.toFixed(2)}</TableCell>
                                    <TableCell>{data.type}</TableCell>
                                    <TableCell>
                                        {data.provider.includes('Supabase') || data.provider === 'Firebase' 
                                            ? <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Yes</Badge> 
                                            : <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">No (Need custom API)</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        {data.provider.includes('Supabase') || data.provider === 'Firebase'
                                            ? <span className="text-green-600">Yes</span>
                                            : <span className="text-red-500">No</span>}
                                    </TableCell>
                                    <TableCell>{data.difficulty}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default MigrationAlternativesAnalysis;
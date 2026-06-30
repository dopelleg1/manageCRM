import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateBackupSize } from '@/services/BackupManagementService';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#a855f7', '#64748b'];

const CloudStorageCharts = ({ stats, folders }) => {
    if (!stats || !folders) return null;

    const pieData = [
        { name: 'Immagini', value: stats.byType?.images || 0 },
        { name: 'PDF', value: stats.byType?.pdfs || 0 },
        { name: 'Documenti', value: stats.byType?.documents || 0 },
        { name: 'Video', value: stats.byType?.videos || 0 },
        { name: 'Altro', value: stats.byType?.other || 0 },
    ].filter(item => item.value > 0);

    const barData = folders
        .map(f => ({ name: f.name === '(root)' ? 'Root' : f.name.split('/').pop(), size: f.totalSize, rawName: f.name }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 5); // Top 5 folders by size

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded shadow-md text-sm">
                    <p className="font-semibold">{label || payload[0].name}</p>
                    <p className="text-indigo-600 dark:text-indigo-400">
                        {payload[0].dataKey === 'size' ? calculateBackupSize(payload[0].value) : `${payload[0].value} file`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Distribuzione File</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Nessun dato</div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Top 5 Cartelle per Dimensione</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                                <YAxis tickFormatter={(val) => calculateBackupSize(val).split(' ')[0]} width={40} tick={{ fontSize: 10 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Bar dataKey="size" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Nessun dato</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CloudStorageCharts;
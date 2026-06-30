import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, LayoutList, HardDrive } from 'lucide-react';
import { calculateBackupSize } from '@/services/BackupManagementService';

const DatabaseAnalysisTable = ({ data = [] }) => {
    const totalRecords = data.reduce((acc, row) => acc + (row.record_count || 0), 0);
    const totalSize = data.reduce((acc, row) => acc + (row.size_bytes || 0), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <LayoutList className="h-4 w-4" /> Totale Tabelle
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Database className="h-4 w-4" /> Totale Record
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{totalRecords.toLocaleString('it-IT')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <HardDrive className="h-4 w-4" /> Dimensione Stimata
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">{calculateBackupSize(totalSize)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome Tabella</TableHead>
                            <TableHead className="text-right">N. Record</TableHead>
                            <TableHead className="text-right">Dimensione</TableHead>
                            <TableHead>Colonne</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    Nessun dato disponibile. Avvia un'analisi.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.sort((a, b) => b.record_count - a.record_count).map((row) => (
                                <TableRow key={row.table_name}>
                                    <TableCell className="font-medium font-mono">{row.table_name}</TableCell>
                                    <TableCell className="text-right">{row.record_count?.toLocaleString('it-IT') || 0}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{calculateBackupSize(row.size_bytes)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[400px]">
                                            {(row.columns || []).map(col => (
                                                <Badge key={col} variant="outline" className="text-[10px] px-1 py-0 h-4">
                                                    {col}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default DatabaseAnalysisTable;
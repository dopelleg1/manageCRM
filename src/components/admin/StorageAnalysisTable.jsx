import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Files, FileArchive, Image as ImageIcon, FileText } from 'lucide-react';
import { calculateBackupSize } from '@/services/BackupManagementService';

const StorageAnalysisTable = ({ data = [] }) => {
    const totalFiles = data.length;
    const totalSize = data.reduce((acc, file) => acc + (file.size || 0), 0);

    const getFileIcon = (type) => {
        if (type.includes('zip') || type.includes('archive')) return <FileArchive className="h-4 w-4 text-amber-500" />;
        if (type.includes('image')) return <ImageIcon className="h-4 w-4 text-green-500" />;
        return <FileText className="h-4 w-4 text-blue-500" />;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Files className="h-4 w-4" /> Totale File
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalFiles.toLocaleString('it-IT')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <HardDrive className="h-4 w-4" /> Spazio Occupato
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{calculateBackupSize(totalSize)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Percorso File</TableHead>
                            <TableHead>Nome File</TableHead>
                            <TableHead className="text-right">Dimensione</TableHead>
                            <TableHead>Data Creazione</TableHead>
                            <TableHead>Tipo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Nessun dato disponibile. Avvia un'analisi.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((file, idx) => (
                                <TableRow key={`${file.bucket}-${file.path}-${idx}`}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {file.bucket}/{file.path.split('/').slice(0, -1).join('/')}
                                    </TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {getFileIcon(file.type)}
                                        {file.name}
                                    </TableCell>
                                    <TableCell className="text-right">{calculateBackupSize(file.size)}</TableCell>
                                    <TableCell>{new Date(file.created_at).toLocaleString('it-IT')}</TableCell>
                                    <TableCell className="text-xs">{file.type}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default StorageAnalysisTable;
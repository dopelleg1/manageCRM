import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Folder, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateBackupSize } from '@/services/BackupManagementService';

const CloudStorageFoldersTable = ({ folders = [] }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'totalSize', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedFolders = [...folders].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cartella</TableHead>
                        <TableHead className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('fileCount')} className="h-8">
                                N. File <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('totalSize')} className="h-8">
                                Dimensione <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead>Tipo Prevalente</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedFolders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nessuna cartella trovata.</TableCell>
                        </TableRow>
                    ) : (
                        sortedFolders.map((folder, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Folder className="h-4 w-4 text-amber-500" />
                                    {folder.name}
                                </TableCell>
                                <TableCell className="text-right">{folder.fileCount}</TableCell>
                                <TableCell className="text-right">{calculateBackupSize(folder.totalSize)}</TableCell>
                                <TableCell className="capitalize">{folder.predominantType}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default CloudStorageFoldersTable;
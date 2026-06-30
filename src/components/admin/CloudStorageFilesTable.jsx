import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { calculateBackupSize } from '@/services/BackupManagementService';
import { Eye, Download, Trash2, File as FileIcon, Image as ImageIcon, FileText, FileVideo } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CloudStorageFilesTable = ({ files = [] }) => {
    const { toast } = useToast();

    const getFileIcon = (category) => {
        switch (category) {
            case 'images': return <ImageIcon className="h-4 w-4 text-blue-500" />;
            case 'pdfs': return <FileText className="h-4 w-4 text-red-500" />;
            case 'videos': return <FileVideo className="h-4 w-4 text-purple-500" />;
            case 'documents': return <FileText className="h-4 w-4 text-green-500" />;
            default: return <FileIcon className="h-4 w-4 text-slate-500" />;
        }
    };

    const handleAction = () => {
        toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" });
    };

    return (
        <div className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden mt-6">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome File</TableHead>
                        <TableHead>Cartella</TableHead>
                        <TableHead className="text-right">Dimensione</TableHead>
                        <TableHead>Data Modifica</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {files.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nessun file trovato.</TableCell>
                        </TableRow>
                    ) : (
                        files.slice(0, 100).map((file) => ( // Limiting to 100 for performance in UI
                            <TableRow key={file.id}>
                                <TableCell className="font-medium flex items-center gap-2 max-w-[200px] truncate" title={file.name}>
                                    {getFileIcon(file.category)}
                                    <span className="truncate">{file.name}</span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{file.path.replace(`/${file.name}`, '') || '(root)'}</TableCell>
                                <TableCell className="text-right">{calculateBackupSize(file.size)}</TableCell>
                                <TableCell className="text-sm">{new Date(file.updated_at || file.created_at).toLocaleString('it-IT')}</TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAction} title="Visualizza">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={handleAction} title="Scarica">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={handleAction} title="Elimina">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            {files.length > 100 && (
                <div className="p-3 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 border-t">
                    Mostrando i primi 100 file di {files.length}. Usa i filtri per cercare.
                </div>
            )}
        </div>
    );
};

export default CloudStorageFilesTable;
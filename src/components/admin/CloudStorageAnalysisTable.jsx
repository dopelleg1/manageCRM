import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Files, Image as ImageIcon, FileText, FileVideo, FileDigit, HelpCircle } from 'lucide-react';
import { calculateBackupSize } from '@/services/BackupManagementService';

const CloudStorageAnalysisTable = ({ stats }) => {
    if (!stats) return null;

    const { totalFiles, totalSize, byType } = stats;

    // Hardcoded max size for visual indicator (e.g., 5GB)
    const MAX_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; 
    const usagePercentage = Math.min(100, (totalSize / MAX_STORAGE_BYTES) * 100).toFixed(1);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                        <Files className="h-4 w-4" /> File Totali
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{totalFiles.toLocaleString('it-IT')}</div>
                </CardContent>
            </Card>

            <Card className="bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <HardDrive className="h-4 w-4" /> Spazio Utilizzato
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{calculateBackupSize(totalSize)}</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                        <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{usagePercentage}% di 5 GB (Quota stimata)</div>
                </CardContent>
            </Card>

            <Card className="col-span-1 lg:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Distribuzione per Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-5 gap-2 text-center text-sm">
                        <div className="flex flex-col items-center p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                            <ImageIcon className="h-5 w-5 mb-1" />
                            <span className="font-semibold">{byType?.images || 0}</span>
                            <span className="text-xs opacity-70">Immagini</span>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-md bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                            <FileText className="h-5 w-5 mb-1" />
                            <span className="font-semibold">{byType?.pdfs || 0}</span>
                            <span className="text-xs opacity-70">PDF</span>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-md bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                            <FileDigit className="h-5 w-5 mb-1" />
                            <span className="font-semibold">{byType?.documents || 0}</span>
                            <span className="text-xs opacity-70">Documenti</span>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400">
                            <FileVideo className="h-5 w-5 mb-1" />
                            <span className="font-semibold">{byType?.videos || 0}</span>
                            <span className="text-xs opacity-70">Video</span>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                            <HelpCircle className="h-5 w-5 mb-1" />
                            <span className="font-semibold">{byType?.other || 0}</span>
                            <span className="text-xs opacity-70">Altro</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CloudStorageAnalysisTable;
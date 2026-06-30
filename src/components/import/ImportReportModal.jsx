import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, XCircle, Download, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Papa from 'papaparse';

const ImportReportModal = ({ isOpen, onClose, report, tableName }) => {
    if (!report) return null;

    const handleExportReport = () => {
        const data = [
            ...report.inserted.map(r => ({ ...r, status: 'INSERTED', reason: 'Nuovo record' })),
            ...report.updated.map(r => ({ ...r, status: 'UPDATED', reason: 'Campi vuoti completati' })),
            ...report.skipped.map(item => ({ ...(item.record || {}), status: 'SKIPPED', reason: item.reason }))
        ];

        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `import_report_${tableName}_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    const RecordList = ({ records, type }) => (
        <ScrollArea className="h-[300px] w-full border rounded-md p-2">
            {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                    Nessun record in questa categoria.
                </div>
            ) : (
                <div className="space-y-2">
                    {records.map((item, idx) => {
                        const rec = type === 'skipped' ? item.record : item;
                        const reason = type === 'skipped' ? item.reason : null;
                        return (
                            <div key={idx} className="text-sm p-2 bg-slate-50 rounded border flex justify-between items-start">
                                <div className="truncate flex-1">
                                    <span className="font-semibold">{rec.nome || rec.ragione_sociale || 'No Name'}</span>
                                    <span className="mx-2 text-gray-400">|</span>
                                    <span className="text-xs text-gray-600">{rec.email || rec.telefono || rec.codice || 'No ID'}</span>
                                </div>
                                {reason && <span className="text-xs text-orange-600 ml-2 italic">{reason}</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </ScrollArea>
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" /> Risultati Importazione
                    </DialogTitle>
                    <DialogDescription>Riepilogo delle operazioni eseguite.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4 flex flex-col items-center">
                            <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                            <span className="text-2xl font-bold text-green-800">{report.insertedCount}</span>
                            <span className="text-xs uppercase text-green-600 font-semibold">Inseriti</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4 flex flex-col items-center">
                            <AlertTriangle className="h-8 w-8 text-blue-600 mb-2" />
                            <span className="text-2xl font-bold text-blue-800">{report.updatedCount}</span>
                            <span className="text-xs uppercase text-blue-600 font-semibold">Aggiornati</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="p-4 flex flex-col items-center">
                            <XCircle className="h-8 w-8 text-slate-500 mb-2" />
                            <span className="text-2xl font-bold text-slate-700">{report.skippedCount}</span>
                            <span className="text-xs uppercase text-slate-500 font-semibold">Saltati</span>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="inserted" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="inserted">Nuovi ({report.insertedCount})</TabsTrigger>
                        <TabsTrigger value="updated">Aggiornati ({report.updatedCount})</TabsTrigger>
                        <TabsTrigger value="skipped">Saltati ({report.skippedCount})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="inserted">
                        <RecordList records={report.inserted} type="inserted" />
                    </TabsContent>
                    <TabsContent value="updated">
                        <RecordList records={report.updated} type="updated" />
                    </TabsContent>
                    <TabsContent value="skipped">
                        <RecordList records={report.skipped} type="skipped" />
                    </TabsContent>
                </Tabs>

                {report.errors.length > 0 && (
                    <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 max-h-20 overflow-y-auto">
                        <strong>Errori ({report.errors.length}):</strong>
                        <ul className="list-disc pl-4 mt-1">
                            {report.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:justify-between">
                    <Button variant="outline" onClick={handleExportReport}>
                        <Download className="mr-2 h-4 w-4" /> Scarica Report CSV
                    </Button>
                    <Button onClick={onClose}>Chiudi</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportReportModal;
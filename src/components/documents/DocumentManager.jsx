import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Trash, Upload, XCircle } from 'lucide-react';

const DocumentManager = forwardRef(({ recordId, tableName, isEditing, onPendingFilesChange, onDocumentsUpdated, onDebugLog }, ref) => {
    const [documents, setDocuments] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchDocuments = async () => {
        if (!recordId || !tableName) return;
        console.log(`[DocumentManager] Fetching documents for recordId: ${recordId}, tableName: ${tableName}`);
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('record_id', recordId)
            .eq('table_name', tableName);

        if (error) {
            console.error('[DocumentManager] Error fetching documents:', error);
            toast({
                title: "Errore nel recupero documenti",
                description: error.message,
                variant: "destructive",
            });
        } else {
            console.log('[DocumentManager] Documents fetched successfully:', data);
            setDocuments(data || []);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [recordId, tableName]);

    useImperativeHandle(ref, () => {
        console.log("DocumentManager: useImperativeHandle configurato");
        
        const uploadDirectly = async (currentRecordId) => {
            console.log('[DocumentManager-uploadDirectly] uploadDirectly() chiamata');
            if(onDebugLog) onDebugLog('Chiamata uploadDirectly', 'progress', { currentRecordId });

            if (selectedFiles.length === 0) {
                console.log('[DocumentManager-uploadDirectly] Nessun file da caricare.');
                if(onDebugLog) onDebugLog('uploadDirectly Info', 'info', 'Nessun file selezionato');
                return true;
            }
            console.log('[DocumentManager-uploadDirectly] File pendenti da uploadare:', selectedFiles.map(f => f.name));

            if (!currentRecordId || !tableName || !user?.id) {
                console.error('[DocumentManager-uploadDirectly] Dati mancanti per l\'upload.', { currentRecordId, tableName, user: !!user });
                if(onDebugLog) onDebugLog('Errore uploadDirectly', 'error', 'Dati mancanti (recordId o tableName)');
                toast({
                    title: "Errore",
                    description: "Impossibile caricare i file: ID del record non valido o utente non autenticato.",
                    variant: "destructive",
                });
                return false;
            }

            console.log(`[DocumentManager-uploadDirectly] Inizio upload di ${selectedFiles.length} file per il recordId: ${currentRecordId}`);
            setUploading(true);
            
            const uploadPromises = selectedFiles.map(async (file) => {
                const filePath = `${tableName}/${currentRecordId}/${Date.now()}-${file.name}`;
                console.log(`[DocumentManager-uploadDirectly] Caricando file: ${file.name} nella cartella: ${tableName}/${currentRecordId}/`);
                
                if(onDebugLog) onDebugLog('Inizio upload file', 'progress', { fileName: file.name, size: file.size, path: filePath });

                // Upload del file allo storage
                let uploadResult;
                try {
                    const { data, error: uploadError } = await supabase.storage
                        .from('documents')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    uploadResult = data;
                    console.log("[DocumentManager-uploadDirectly] Upload su Storage completato con successo:", uploadResult);
                    if(onDebugLog) onDebugLog('File caricato su Storage', 'success', { fileName: file.name });
                } catch (error) {
                    console.error("ERRORE UPLOAD FILE:", error);
                    if(onDebugLog) onDebugLog('Errore Storage Upload', 'error', { fileName: file.name, message: error.message });
                    toast({
                        title: "Errore caricamento file",
                        description: `Impossibile caricare ${file.name}: ${error.message}`,
                        variant: "destructive",
                    });
                    return null;
                }

                // Inserimento dei metadati nel database
                try {
                    const { data, error: dbError } = await supabase.from('documents').insert({
                        record_id: currentRecordId,
                        table_name: tableName,
                        file_name: file.name,
                        file_path: filePath,
                        file_type: file.type,
                        file_size: file.size,
                        uploaded_by: user.id,
                    }).select();
                    
                    if (dbError) throw dbError;
                    console.log("[DocumentManager-uploadDirectly] Salvataggio metadati completato con successo:", data);
                    if(onDebugLog) onDebugLog('Metadati salvati in DB', 'success', { fileName: file.name });
                } catch (error) {
                    console.error("ERRORE SALVATAGGIO METADATI:", error);
                    if(onDebugLog) onDebugLog('Errore DB Metadati', 'error', { fileName: file.name, message: error.message });
                    toast({
                        title: "Errore salvataggio info documento",
                        description: `Impossibile salvare i dati per ${file.name}: ${error.message}`,
                        variant: "destructive",
                    });
                    // Rollback: rimuove il file se l'inserimento nel DB fallisce
                    await supabase.storage.from('documents').remove([filePath]);
                    return null;
                }

                return true;
            });

            const results = await Promise.all(uploadPromises);
            console.log('[DocumentManager-uploadDirectly] Risultati finali degli upload:', results);
            setUploading(false);
            setSelectedFiles([]);
            onPendingFilesChange?.([]);
            fetchDocuments();
            if(onDocumentsUpdated) onDocumentsUpdated();
            
            const allSuccess = results.every(r => r === true);
            if (allSuccess) {
                toast({ title: "Successo", description: "Documenti caricati correttamente." });
                if(onDebugLog) onDebugLog('Upload Completato', 'success', 'Tutti i file caricati con successo');
            } else {
                if(onDebugLog) onDebugLog('Upload Parziale/Fallito', 'warning', 'Alcuni file potrebbero non essere stati caricati');
            }
            return allSuccess;
        };

        return { uploadDirectly };
    });

    const handleAddFileClick = (e) => {
        e.preventDefault();
        const timestamp = new Date().toISOString();
        if (onDebugLog) onDebugLog("Click Aggiungi File", "info", { timestamp, message: "Bottone cliccato dall'utente" });
        
        if (fileInputRef.current) {
             if (onDebugLog) onDebugLog("Input File Triggerato", "info", { timestamp: new Date().toISOString(), message: "Click programmatico su input hidden" });
             fileInputRef.current.click();
        } else {
             const errorMsg = "Ref dell'input file non collegato! L'elemento input potrebbe non essere stato renderizzato.";
             if (onDebugLog) onDebugLog("Errore Input File", "error", { timestamp, error: errorMsg });
             console.error(errorMsg);
             toast({ title: "Errore UI", description: "Impossibile aprire la selezione file. Riprova.", variant: "destructive" });
        }
    };

    const handleFileChange = (event) => {
        try {
            const timestamp = new Date().toISOString();
            if (onDebugLog) onDebugLog("Input onChange Chiamato", "info", { timestamp });

            const newFiles = Array.from(event.target.files || []);
            
            if (newFiles.length === 0) {
                 if (onDebugLog) onDebugLog("Selezione File Annullata", "warning", { timestamp, message: "Nessun file presente in event.target.files" });
                 return;
            }

            newFiles.forEach(f => {
                if (onDebugLog) onDebugLog("File Selezionato", "success", { 
                    timestamp, 
                    name: f.name, 
                    size: f.size,
                    type: f.type
                });
            });

            const updatedFiles = [...selectedFiles, ...newFiles];
            setSelectedFiles(updatedFiles);
            onPendingFilesChange?.(updatedFiles);
            console.log('[DocumentManager] File selezionati:', updatedFiles);
            
            // Reset input value to allow selecting the same file again if needed
            event.target.value = '';

        } catch (error) {
            const timestamp = new Date().toISOString();
            const errorMsg = error.message || "Errore sconosciuto durante la selezione file";
            if (onDebugLog) onDebugLog("Errore handleFileSelect", "error", { timestamp, error: errorMsg });
            console.error("Error in handleFileChange:", error);
            toast({ title: "Errore selezione file", description: errorMsg, variant: "destructive" });
        }
    };

    const removeSelectedFile = (index) => {
        const updatedFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updatedFiles);
        onPendingFilesChange?.(updatedFiles);
        console.log('[DocumentManager] File rimossi, rimanenti:', updatedFiles);
    };

    const downloadDocument = async (filePath, fileName) => {
        console.log(`[DocumentManager] Tentativo di download: ${filePath}`);
        const { data, error } = await supabase.storage
            .from('documents')
            .download(filePath);

        if (error) {
            console.error(`[DocumentManager] Errore download ${fileName}:`, error);
            toast({
                title: "Errore download",
                description: `Impossibile scaricare ${fileName}: ${error.message}`,
                variant: "destructive",
            });
            return;
        }

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`[DocumentManager] Download completato: ${fileName}`);
    };

    const deleteDocument = async (documentId, filePath) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo documento?")) return;
        
        console.log(`[DocumentManager] Tentativo di eliminazione documento: id=${documentId}, path=${filePath}`);

        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([filePath]);

        if (storageError) {
            console.error(`[DocumentManager] Errore eliminazione file dallo storage:`, storageError);
            toast({
                title: "Errore eliminazione file",
                description: `Impossibile eliminare il file dallo storage: ${storageError.message}`,
                variant: "destructive",
            });
        }

        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (dbError) {
             console.error(`[DocumentManager] Errore eliminazione record dal DB:`, dbError);
            toast({
                title: "Errore eliminazione info documento",
                description: `Impossibile eliminare il record del documento: ${dbError.message}`,
                variant: "destructive",
            });
            return;
        }

        toast({ title: "Successo", description: "Documento eliminato correttamente." });
        console.log(`[DocumentManager] Documento eliminato con successo: id=${documentId}`);
        fetchDocuments();
        if(onDocumentsUpdated) onDocumentsUpdated();
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documenti Allegati</h3>

            {isEditing && (
                <div className="border p-4 rounded-md">
                    <input 
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={uploading}
                        accept="*/*"
                    />
                    <Button 
                        type="button" 
                        variant="secondary" 
                        className="w-full mb-2" 
                        onClick={handleAddFileClick}
                        disabled={uploading}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Aggiungi File
                    </Button>

                    {selectedFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                            <p className="text-sm font-medium">File selezionati:</p>
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                    <span>{file.name}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSelectedFile(index)}
                                        disabled={uploading}
                                        aria-label={`Rimuovi ${file.name}`}
                                    >
                                        <XCircle className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {documents.length === 0 && selectedFiles.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nessun documento allegato.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome File</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map((doc) => (
                            <TableRow key={doc.id}>
                                <TableCell className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <span>{doc.file_name}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => downloadDocument(doc.file_path, doc.file_name)} aria-label={`Scarica ${doc.file_name}`}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    {isEditing && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => deleteDocument(doc.id, doc.file_path)} aria-label={`Elimina ${doc.file_name}`}>
                                            <Trash className="h-4 w-4 text-red-500" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
});

export default DocumentManager;
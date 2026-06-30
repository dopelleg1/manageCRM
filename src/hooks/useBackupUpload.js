import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { createCompleteBackup } from '@/services/BackupManagementService';
import { useToast } from '@/components/ui/use-toast';

export const useBackupUpload = () => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreatingProtection, setIsCreatingProtection] = useState(false);
    const [protectionCreated, setProtectionCreated] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        
        if (!selected.name.endsWith('.zip')) {
            toast({
                title: "File non valido",
                description: "Seleziona un file .zip valido.",
                variant: "destructive"
            });
            return;
        }
        setFile(selected);
        setError(null);
    };

    const createProtectionBackup = async () => {
        setIsCreatingProtection(true);
        setError(null);
        try {
            await createCompleteBackup();
            setProtectionCreated(true);
            toast({
                title: "Backup di Protezione Creato",
                description: "Stato attuale salvato con successo.",
                variant: "success"
            });
            return true;
        } catch (err) {
            setError(err.message);
            toast({
                title: "Errore",
                description: "Impossibile creare il backup di protezione.",
                variant: "destructive"
            });
            return false;
        } finally {
            setIsCreatingProtection(false);
        }
    };

    const uploadBackup = async () => {
        if (!file) return false;
        
        setIsUploading(true);
        setError(null);
        setProgress(10);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const user = session?.user;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('user_id', user?.id);

            setProgress(40);

            const { data, error: invokeError } = await supabase.functions.invoke('upload-backup', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            setProgress(80);

            if (invokeError) throw invokeError;
            if (!data?.success) throw new Error(data?.error || "Upload fallito");

            setProgress(100);
            toast({
                title: "Upload Completato",
                description: `Backup ${data.version} caricato con successo.`,
                variant: "success"
            });
            
            return true;
        } catch (err) {
            setError(err.message);
            toast({
                title: "Errore di Upload",
                description: err.message,
                variant: "destructive"
            });
            return false;
        } finally {
            setIsUploading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const reset = () => {
        setFile(null);
        setProtectionCreated(false);
        setError(null);
        setIsUploading(false);
        setIsCreatingProtection(false);
        setProgress(0);
    };

    return {
        file,
        handleFileChange,
        createProtectionBackup,
        uploadBackup,
        isCreatingProtection,
        isUploading,
        protectionCreated,
        progress,
        error,
        reset
    };
};
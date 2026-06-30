import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { createCompleteBackup } from '@/services/BackupManagementService';
import { useToast } from '@/components/ui/use-toast';

export const useBackupRestore = () => {
    const [isRestoring, setIsRestoring] = useState(false);
    const [isCreatingProtection, setIsCreatingProtection] = useState(false);
    const [protectionCreated, setProtectionCreated] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

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

    const performRestore = async (backupId) => {
        setIsRestoring(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            const { data, error: invokeError } = await supabase.functions.invoke('restore-backup', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: { backupId }
            });

            if (invokeError) throw invokeError;
            if (!data?.success) throw new Error(data?.error || "Restore fallito");

            toast({
                title: "Ripristino Completato",
                description: "Il sistema è stato ripristinato con successo.",
                variant: "success"
            });
            
            setTimeout(() => window.location.reload(), 2000);
            return true;
        } catch (err) {
            setError(err.message);
            toast({
                title: "Errore di Ripristino",
                description: err.message,
                variant: "destructive"
            });
            return false;
        } finally {
            setIsRestoring(false);
        }
    };

    const reset = () => {
        setProtectionCreated(false);
        setError(null);
        setIsRestoring(false);
        setIsCreatingProtection(false);
    };

    return {
        createProtectionBackup,
        performRestore,
        isCreatingProtection,
        isRestoring,
        protectionCreated,
        error,
        reset
    };
};
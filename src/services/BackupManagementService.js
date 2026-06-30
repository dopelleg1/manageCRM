import { supabase } from '@/lib/customSupabaseClient';

export const createCompleteBackup = async (logger = console.log) => {
    try {
        logger("[Step 1] Initiating backup creation via Edge Function...");
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
             throw new Error("Authentication failed: No active session found. Please log in again.");
        }
        
        const token = session.access_token;
        
        const { data, error } = await supabase.functions.invoke('create-complete-backup', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        if (error) {
            if (error.status === 401) {
                 logger(`[Error - Step 1/2] Authentication failed: Unauthorized (401).`);
                 throw new Error("Authentication failed: Unauthorized. Please check your session.");
            }
            logger(`[Error - Step 1/2] Edge function failed: ${error.message} (Status: ${error.status})`);
            throw error;
        }
        
        logger(`[Step 2] Edge function completed successfully. Response data: ${JSON.stringify(data)}`);
        
        // Step 3: Verify
        logger("[Step 3] Verifying the saved record by reading it back from the database...");
        const backupId = data?.id || data?.backup_id;
        
        if (backupId) {
             const { data: verifyData, error: verifyError } = await supabase
                .from('backups')
                .select('*')
                .eq('id', backupId)
                .single();
                
             if (verifyError) {
                 logger(`[Error - Step 3] SQL Error during verification: ${verifyError.message} (Code: ${verifyError.code})`);
             } else if (verifyData) {
                 logger(`[Success - Step 3] Record found successfully: ID=${verifyData.id}, Version=${verifyData.version}, Status=${verifyData.status}, FilePath=${verifyData.storage_path || 'N/A'}`);
             } else {
                 logger(`[Warning - Step 3] Record NOT found for ID: ${backupId}`);
             }
        } else {
             logger("[Step 3] No explicit ID returned. Verifying latest record in database...");
             const { data: latest, error: lErr } = await supabase
                .from('backups')
                .select('*')
                .order('date', {ascending: false})
                .limit(1)
                .single();
                
             if (lErr) {
                 logger(`[Error - Step 3] SQL Error fetching latest: ${lErr.message}`);
             } else if (latest) {
                 logger(`[Success - Step 3] Latest record found: ID=${latest.id}, Version=${latest.version}`);
             } else {
                 logger("[Warning - Step 3] Record NOT found. The backups table is empty.");
             }
        }
        return data;
    } catch (err) {
        logger(`[Fatal Error] createCompleteBackup aborted: ${err.message}`);
        throw err;
    }
};

export const downloadBackup = async (backupId) => {
    try {
        console.log("Downloading backup", backupId);
        
        // First get the backup record to find the storage path
        const { data: backupRecord, error: dbError } = await supabase
            .from('backups')
            .select('storage_path, version')
            .eq('id', backupId)
            .single();

        if (dbError || !backupRecord || !backupRecord.storage_path) {
            throw new Error(dbError?.message || "Storage path non trovato per questo backup.");
        }

        // Download from storage
        const { data, error } = await supabase.storage
            .from('documents')
            .download(backupRecord.storage_path);

        if (error) {
            throw new Error(`Errore durante il download dal cloud: ${error.message}`);
        }

        // Trigger browser download
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `backup-${backupRecord.version}.zip`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (err) {
        console.error("Error in downloadBackup:", err);
        throw err;
    }
};

export const restoreBackup = async (backupId, currentCount = 0) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const { data, error } = await supabase.functions.invoke('restore-backup', {
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: { backupId }
    });
    if (error) throw error;
    
    await supabase.from('backups').update({
        last_restored: new Date().toISOString(),
        restore_count: currentCount + 1,
        notes: 'Ripristinato il ' + new Date().toLocaleString()
    }).eq('id', backupId);
    
    return data;
};

export const deleteBackup = async (backupId) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    // Attempt to invoke edge function if exists, otherwise direct DB delete
    try {
        await supabase.functions.invoke('delete-backup', {
            headers: { Authorization: `Bearer ${token}` },
            body: { backupId }
        });
    } catch (e) {
        console.warn("Delete edge function missing or failed, proceeding with direct DB deletion.", e);
    }
    
    const { data, error } = await supabase.from('backups').delete().eq('id', backupId);
    if (error) throw error;
    
    return data;
};

export const getBackupsList = async (logger = console.log) => {
    try {
        logger("[Step 4] Calling getBackupsList() to fetch all backups...");
        const { data, error } = await supabase
            .from('backups')
            .select('id, version, type, date, size, status, last_restored, restore_count, notes, storage_path')
            .order('date', { ascending: false });
        
        if (error) {
            logger(`[Error - Step 4] Supabase query error in getBackupsList: ${error.message} (Code: ${error.code})`);
            throw error;
        }
        
        logger(`[Success - Step 4] Fetched ${data ? data.length : 0} backups. First item: ${data && data.length > 0 ? data[0].id : 'None'}`);
        return data || [];
    } catch (error) {
        logger(`[Error - Step 4] Could not fetch backups: ${error.message}`);
        return []; 
    }
};

export const calculateBackupSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const logBackupOperation = async (backupId, operation, performedBy, status, notes) => {
    try {
        const { error } = await supabase.from('backups').update({
            notes: `[${operation}] ${notes}`
        }).eq('id', backupId);
        
        if (error) console.error("Error updating backup notes", error);
        return { success: !error };
    } catch (e) {
        console.error("Catch: Error updating backup notes", e);
        return { success: false };
    }
};
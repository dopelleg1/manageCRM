import { useEffect, useState, useCallback } from 'react';
import { getDraft } from '@/utils/draftAutoSaveService';

/**
 * Hook to detect visibility changes and check for drafts.
 * Simplified to only check when document becomes visible.
 */
export const useVisibilityRestore = (tableName, recordId) => {
    const [restoredDraft, setRestoredDraft] = useState(null);
    const [hasDraft, setHasDraft] = useState(false);

    const checkDraft = useCallback(() => {
        if (!tableName) return;
        const draft = getDraft(tableName, recordId);
        if (draft) {
            setRestoredDraft(draft);
            setHasDraft(true);
        } else {
            setHasDraft(false);
        }
    }, [tableName, recordId]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkDraft();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkDraft]);

    return {
        hasDraft,
        draftData: restoredDraft
    };
};
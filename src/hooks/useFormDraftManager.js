import { useState, useEffect, useCallback } from 'react';
import { saveDraft, getDraft, deleteDraft } from '@/hooks/useDraftAutoSave';

export const useFormDraftManager = (storageKey) => {
    const [draft, setDraft] = useState(null);

    // Load draft on mount
    useEffect(() => {
        if (storageKey) {
            const savedData = getDraft(storageKey);
            if (savedData) {
                setDraft(savedData);
            }
        }
    }, [storageKey]);

    const saveDraftField = useCallback((fieldName, value) => {
        if (!storageKey) return;
        
        // Security: Never save password fields
        if (['password', 'confirmPassword', 'newPassword', 'oldPassword'].includes(fieldName)) {
            return;
        }

        setDraft(prev => {
            const updated = { ...prev, [fieldName]: value };
            saveDraft(storageKey, updated);
            return updated;
        });
    }, [storageKey]);
    
    // Save multiple fields at once (useful for form objects)
    const saveDraftObject = useCallback((obj) => {
        if (!storageKey) return;
        
        // Filter out sensitive keys if passing full object
        const safeObj = { ...obj };
        ['password', 'confirmPassword', 'newPassword', 'oldPassword'].forEach(k => delete safeObj[k]);

        setDraft(safeObj);
        saveDraft(storageKey, safeObj);
    }, [storageKey]);

    const clearDraft = useCallback(() => {
        if (storageKey) {
            deleteDraft(storageKey);
            setDraft(null);
        }
    }, [storageKey]);

    return {
        draft,
        saveDraftField,
        saveDraftObject,
        clearDraft,
        getDraft: () => getDraft(storageKey) // Helper to get fresh draft synchronously
    };
};
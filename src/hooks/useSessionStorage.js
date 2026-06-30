import { useCallback } from 'react';

/**
 * Hook to manage sessionStorage for unsaved form data.
 * Provides methods to save, retrieve, and clear form data.
 */
export const useSessionStorage = () => {
    
    /**
     * Generates a consistent key for storage
     */
    const getStorageKey = useCallback((tableName, recordId) => {
        const safeId = recordId || 'new';
        return `draft_${tableName}_${safeId}`;
    }, []);

    /**
     * Save form data to sessionStorage
     */
    const saveFormData = useCallback((tableName, recordId, formData) => {
        try {
            if (!tableName) return;
            const key = getStorageKey(tableName, recordId);
            sessionStorage.setItem(key, JSON.stringify(formData));
        } catch (error) {
            console.error("Error saving to sessionStorage:", error);
        }
    }, [getStorageKey]);

    /**
     * Retrieve form data from sessionStorage
     */
    const getFormData = useCallback((tableName, recordId) => {
        try {
            if (!tableName) return null;
            const key = getStorageKey(tableName, recordId);
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error("Error retrieving from sessionStorage:", error);
            return null;
        }
    }, [getStorageKey]);

    /**
     * Clear form data for a specific record
     */
    const clearFormData = useCallback((tableName, recordId) => {
        try {
            if (!tableName) return;
            const key = getStorageKey(tableName, recordId);
            sessionStorage.removeItem(key);
        } catch (error) {
            console.error("Error clearing sessionStorage:", error);
        }
    }, [getStorageKey]);

    /**
     * Clear all draft data (keys starting with 'draft_')
     */
    const clearAllFormData = useCallback(() => {
        try {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('draft_')) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error("Error clearing all form data:", error);
        }
    }, []);

    return {
        saveFormData,
        getFormData,
        clearFormData,
        clearAllFormData
    };
};
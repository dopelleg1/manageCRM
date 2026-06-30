import { useState, useEffect, useCallback } from 'react';

// Core Storage Functions
export const saveDraft = (key, data) => {
    try {
        if (!key || !data) return;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error("Error saving draft to localStorage:", error);
    }
};

export const getDraft = (key) => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error("Error reading draft from localStorage:", error);
        return null;
    }
};

export const deleteDraft = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Error deleting draft from localStorage:", error);
    }
};

// Debounce Hook
export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

// Original Hook Logic (Maintained for backward compatibility if needed, but enhanced)
export const useDraftAutoSave = (tableName, recordId) => {
    // Generate key based on inputs
    const key = recordId && recordId !== 'new' 
        ? `draft_${tableName}_${recordId}` 
        : `draft_${tableName}`;

    const [draftData, setDraftData] = useState(null);
    const [hasDraft, setHasDraft] = useState(false);

    useEffect(() => {
        if (tableName) {
            const data = getDraft(key);
            if (data) {
                setDraftData(data);
                setHasDraft(true);
            }
        }
    }, [key, tableName]);

    const saveCurrentDraft = useCallback((data) => {
        if (tableName && data) {
            saveDraft(key, data);
            setHasDraft(true);
        }
    }, [key, tableName]);

    const removeDraft = useCallback(() => {
        if (tableName) {
            deleteDraft(key);
            setHasDraft(false);
            setDraftData(null);
        }
    }, [key, tableName]);

    return {
        draftData,
        hasDraft,
        saveCurrentDraft,
        removeDraft
    };
};
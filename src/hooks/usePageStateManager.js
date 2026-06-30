import { useState, useCallback, useEffect } from 'react';

export const usePageStateManager = (storageKey) => {
    const [hasPersistedState, setHasPersistedState] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem(storageKey);
        setHasPersistedState(!!stored);
    }, [storageKey]);

    const saveState = useCallback((stateObject) => {
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(stateObject));
            setHasPersistedState(true);
        } catch (e) {
            console.error("Error saving state to sessionStorage", e);
        }
    }, [storageKey]);

    const loadState = useCallback(() => {
        try {
            const stored = sessionStorage.getItem(storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error("Error loading state from sessionStorage", e);
        }
        return null;
    }, [storageKey]);

    const clearState = useCallback(() => {
        try {
            sessionStorage.removeItem(storageKey);
            setHasPersistedState(false);
        } catch (e) {
            console.error("Error clearing state from sessionStorage", e);
        }
    }, [storageKey]);

    return { saveState, loadState, clearState, hasPersistedState };
};
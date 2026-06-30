import { useState, useCallback } from 'react';

const TTL_MS = 30 * 60 * 1000; // 30 minutes Time-To-Live

/**
 * Custom hook to manage persistent search state for different pages.
 * Ensures that results, filters, pagination, and sorting are kept across navigations,
 * with a 30-minute freshness TTL.
 * 
 * @param {string} pageKey - Unique identifier for the page (e.g., 'commercial_activities')
 */
export const useSearchStateManager = (pageKey) => {
  const storageKey = `searchState_${pageKey}`;

  const isSearchStateFresh = useCallback((timestamp) => {
    if (!timestamp) return false;
    return (Date.now() - new Date(timestamp).getTime()) < TTL_MS;
  }, []);

  const loadSearchState = useCallback(() => {
    try {
      const item = localStorage.getItem(storageKey);
      if (item) {
        const parsed = JSON.parse(item);
        if (isSearchStateFresh(parsed.timestamp)) {
          return parsed;
        } else {
          // Cache expired, clean it up
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error(`[useSearchStateManager] Error loading state for ${pageKey}:`, error);
    }
    return null;
  }, [storageKey, isSearchStateFresh]);

  const [searchState, setSearchState] = useState(loadSearchState());

  const saveSearchState = useCallback((searchResults, filters = {}, currentPage = 1, searchQuery = '') => {
    try {
      const newState = {
        searchResults,
        filters,
        currentPage,
        searchQuery,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(newState));
      setSearchState(newState);
    } catch (error) {
      // LocalStorage quota might be exceeded if results are too large
      console.error(`[useSearchStateManager] Error saving state for ${pageKey}:`, error);
    }
  }, [storageKey]);

  const clearSearchState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setSearchState(null);
    } catch (error) {
      console.error(`[useSearchStateManager] Error clearing state for ${pageKey}:`, error);
    }
  }, [storageKey]);

  return {
    searchState,
    saveSearchState,
    loadSearchState,
    clearSearchState,
    isSearchStateFresh,
    hasPersistedState: !!searchState
  };
};
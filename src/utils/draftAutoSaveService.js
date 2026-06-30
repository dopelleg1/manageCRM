/**
 * Simplified Service to manage form drafts in localStorage.
 * Handles saving, retrieving, and deleting drafts.
 */

const getDraftKey = (tableName, recordId) => {
    // Format: draft_{tableName}_{recordId}
    // recordId should be 'new' for new records or the UUID
    return `draft_${tableName}_${recordId || 'new'}`;
};

/**
 * Saves a draft to localStorage.
 * @param {string} tableName - The name of the table (e.g., 'properties').
 * @param {string} recordId - The ID of the record or 'new'.
 * @param {object} formData - The form data to save.
 */
export const saveDraft = (tableName, recordId, formData) => {
    try {
        if (!tableName || !formData) return;
        const key = getDraftKey(tableName, recordId);
        localStorage.setItem(key, JSON.stringify(formData));
    } catch (e) {
        console.error("Draft save failed:", e);
    }
};

/**
 * Retrieves a draft from localStorage.
 * @param {string} tableName 
 * @param {string} recordId 
 * @returns {object|null} - The draft data or null if not found.
 */
export const getDraft = (tableName, recordId) => {
    try {
        const key = getDraftKey(tableName, recordId);
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error("Draft retrieval failed:", e);
        return null;
    }
};

/**
 * Deletes a specific draft.
 * @param {string} tableName 
 * @param {string} recordId 
 */
export const deleteDraft = (tableName, recordId) => {
    try {
        const key = getDraftKey(tableName, recordId);
        localStorage.removeItem(key);
    } catch (e) {
        console.error("Failed to delete draft:", e);
    }
};
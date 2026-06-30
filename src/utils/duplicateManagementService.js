import { supabase } from '@/lib/customSupabaseClient';

/**
 * Checks for related records that would be affected by deletion.
 * @param {string} tableName 
 * @param {Array<string>} ids 
 * @returns {Promise<Object>} Counts of dependent records
 */
export async function checkDependencies(tableName, ids) {
  if (!ids || ids.length === 0) return { appointments: 0, documents: 0, assignment_logs: 0 };

  const { data, error } = await supabase.rpc('check_dependency_counts', {
    target_table: tableName,
    record_ids: ids
  });

  if (error) {
    console.error("Error checking dependencies:", error);
    throw error;
  }

  return data;
}

/**
 * Executes the safe deletion of duplicate records via RPC.
 * Includes built-in retry logic for network stability.
 * 
 * @param {string} tableName 
 * @param {Array<string>} idsToDelete 
 * @param {string} masterRecordId 
 * @param {string} userId 
 * @returns {Promise<Object>} Result of operation
 */
export async function deleteDuplicateRecords(tableName, idsToDelete, masterRecordId, userId) {
  if (!idsToDelete || idsToDelete.length === 0) return { success: true, count: 0 };
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[DuplicateDeletion] Attempt ${attempts}/${maxAttempts} deleting ${idsToDelete.length} records from ${tableName}`);

      // Set master flag first (lightweight operation)
      const { error: masterError } = await supabase
        .from(tableName)
        .update({ is_master_record: true })
        .eq('id', masterRecordId);

      if (masterError) {
        console.warn("[DuplicateDeletion] Failed to flag master record, but proceeding with deletion.", masterError);
      }

      // Call the robust RPC function
      const { data, error } = await supabase.rpc('delete_duplicate_records', {
        target_table: tableName,
        record_ids_to_delete: idsToDelete,
        master_record_id: masterRecordId,
        user_id: userId
      });

      if (error) throw error;

      if (data && data.success === false) {
        throw new Error(data.error || 'Unknown RPC error');
      }

      // INVALIDATION LOGIC (Task 4)
      invalidatePhoneCache();

      return { success: true, count: data.deleted_count };

    } catch (err) {
      console.error(`[DuplicateDeletion] Error on attempt ${attempts}:`, err);
      
      // If it's the last attempt, throw the error
      if (attempts === maxAttempts) {
        // Enhance error object for UI
        const enhancedError = new Error(err.message);
        enhancedError.originalError = err;
        enhancedError.isNetworkError = err.message.includes('Failed to fetch');
        throw enhancedError;
      }
      
      // Wait before retry (exponential backoff: 500ms, 1000ms, etc.)
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempts - 1)));
    }
  }
}

/**
 * Legacy/Fallback method (only used if RPC is unavailable)
 */
export async function setMasterRecord(tableName, recordId) {
  const { error } = await supabase
    .from(tableName)
    .update({ is_master_record: true })
    .eq('id', recordId);

  if (error) throw error;
  return true;
}

/**
 * Dispatches a custom event to notify components (like phone check hooks) 
 * that data has changed and any local caches should be cleared/revalidated.
 */
export function invalidatePhoneCache() {
    try {
        const event = new CustomEvent('duplicate-cache-invalidated');
        window.dispatchEvent(event);
        console.log('[DuplicateManagement] Cache invalidation event dispatched.');
    } catch (e) {
        console.warn('Failed to dispatch cache invalidation event', e);
    }
}
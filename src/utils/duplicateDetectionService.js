import { supabase } from '@/lib/customSupabaseClient';
import { retryOperation } from '@/utils/networkUtils';

/**
 * Finds duplicate records in a specific table based on a key field.
 * Strategies:
 * 1. Try server-side RPC (fastest, most efficient).
 * 2. Fallback to client-side processing if RPC fails (robustness).
 * 
 * @param {string} tableName - The name of the table to check
 * @param {string} keyField - The column name to check for duplicates
 * @returns {Promise<{groups: Array, totalDuplicates: number}>}
 */
export async function findDuplicatesByKey(tableName, keyField) {
  console.log(`[DuplicateDetection] Starting detection for table: ${tableName}, key: ${keyField}`);
  
  // Use retryOperation to handle transient network issues
  return retryOperation(async () => {
    try {
      // STRATEGY 1: Server-side RPC
      // This is the preferred method as it's much faster for large datasets
      // console.log(`[DuplicateDetection] Attempting RPC strategy...`);
      
      const { data: rpcGroups, error: rpcError } = await supabase.rpc('get_duplicate_groups', {
        table_name: tableName,
        column_name: keyField
      });

      if (rpcError) {
        console.warn("[DuplicateDetection] RPC strategy failed, switching to fallback.", rpcError);
        // We explicitly throw here to trigger the catch block below which handles the fallback
        throw new Error(`RPC_FAILED: ${rpcError.message}`);
      }

      if (!rpcGroups || rpcGroups.length === 0) {
        console.log("[DuplicateDetection] No duplicates found via RPC.");
        return { groups: [], totalDuplicates: 0 };
      }

      // If we have groups, we need to fetch the actual record details
      const allIds = rpcGroups.flatMap(g => g.ids);
      
      // Batch fetch records to avoid hitting URL length limits or timeouts with massive lists
      // (Splitting into chunks of 200)
      const chunkSize = 200;
      let allRecords = [];
      
      for (let i = 0; i < allIds.length; i += chunkSize) {
        const chunkIds = allIds.slice(i, i + chunkSize);
        const { data: chunkRecords, error: recordsError } = await supabase
          .from(tableName)
          .select('*')
          .in('id', chunkIds);
          
        if (recordsError) {
          console.error("[DuplicateDetection] Error fetching record details:", recordsError);
          throw recordsError;
        }
        
        if (chunkRecords) {
          allRecords = [...allRecords, ...chunkRecords];
        }
      }

      return processRecordsIntoGroups(rpcGroups, allRecords);

    } catch (error) {
       console.warn(`[DuplicateDetection] Primary strategy failed: ${error.message}. Attempting Client-Side Fallback.`);
       return findDuplicatesClientSide(tableName, keyField);
    }
  });
}

/**
 * Fallback method: Fetches all data and groups in memory.
 * Use only when RPC is unavailable.
 */
async function findDuplicatesClientSide(tableName, keyField) {
  console.log(`[DuplicateDetection] Running client-side fallback for ${tableName}...`);
  try {
    // 1. Fetch all records (potentially heavy, but necessary for fallback)
    // We select only necessary fields first to check if we can optimize, 
    // but for now select * is safest to ensure we have all data for the UI.
    const { data: allRecords, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`[DuplicateDetection] Client-side fetch failed:`, error);
      throw error;
    }

    if (!allRecords || allRecords.length === 0) {
      return { groups: [], totalDuplicates: 0 };
    }

    // 2. Group by keyField in memory
    const groupsMap = new Map();

    allRecords.forEach(record => {
      const key = record[keyField];
      // Skip empty/null keys
      if (!key || key === '') return;
      
      const normalizedKey = String(key).trim();
      if (!groupsMap.has(normalizedKey)) {
        groupsMap.set(normalizedKey, []);
      }
      groupsMap.get(normalizedKey).push(record);
    });

    // 3. Filter for duplicates (count > 1)
    const duplicateGroups = [];
    let totalDuplicates = 0;

    for (const [key, records] of groupsMap.entries()) {
      if (records.length > 1) {
        // Sort by updated_at desc
        records.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA;
        });

        duplicateGroups.push({
          key: key,
          count: records.length,
          records: records
        });
        totalDuplicates += records.length;
      }
    }

    console.log(`[DuplicateDetection] Client-side found ${duplicateGroups.length} groups.`);
    return {
      groups: duplicateGroups,
      totalDuplicates
    };

  } catch (err) {
    console.error(`[DuplicateDetection] FATAL: Client-side detection failed for ${tableName}:`, err);
    throw err;
  }
}

/**
 * Helper to merge RPC group structure with fetched records
 */
function processRecordsIntoGroups(rpcGroups, records) {
  const recordsMap = new Map(records.map(r => [r.id, r]));
      
  const enrichedGroups = rpcGroups.map(group => {
    const groupRecords = group.ids
      .map(id => recordsMap.get(id))
      .filter(Boolean) // Filter out any potentially missing records
      .sort((a, b) => {
          // Sort by updated_at descending (newest first)
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA;
      });

    // Only return groups where we actually found the records
    if (groupRecords.length < 2) return null;

    return {
      key: group.group_key,
      count: group.count,
      records: groupRecords
    };
  }).filter(Boolean);

  return {
    groups: enrichedGroups,
    totalDuplicates: enrichedGroups.reduce((acc, g) => acc + g.records.length, 0)
  };
}
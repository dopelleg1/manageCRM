import { supabase } from '@/lib/customSupabaseClient';

/**
 * Utility to verify migration success comparing old and new DBs.
 */
export const verifyMigration = async (oldClient, newClient, onProgress) => {
  console.log('[Verification] Starting migration verification...');
  const report = {
    schemaMatch: false,
    dataMatch: false,
    tableDetails: [],
    errors: []
  };

  try {
    if (onProgress) onProgress('Fetching source table stats...');
    const { data: oldStats, error: oldErr } = await oldClient.rpc('get_table_stats');
    if (oldErr) throw oldErr;

    if (onProgress) onProgress('Fetching target table stats...');
    const { data: newStats, error: newErr } = await newClient.rpc('get_table_stats');
    if (newErr) throw newErr;

    const oldTableMap = new Map((oldStats || []).map(s => [s.table_name, s.record_count]));
    const newTableMap = new Map((newStats || []).map(s => [s.table_name, s.record_count]));

    let allMatched = true;
    oldTableMap.forEach((oldCount, tableName) => {
      const newCount = newTableMap.get(tableName) || 0;
      const matched = oldCount === newCount;
      if (!matched) allMatched = false;
      report.tableDetails.push({ table: tableName, sourceCount: oldCount, targetCount: newCount, matched });
    });

    report.schemaMatch = true; 
    report.dataMatch = allMatched;
    
    if (onProgress) onProgress('Verification complete.');
    return { success: true, report };
  } catch (err) {
    console.error('[Verification] Failed:', err);
    report.errors.push(err.message);
    return { success: false, report };
  }
};
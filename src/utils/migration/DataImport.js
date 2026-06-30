import { supabase } from '@/lib/customSupabaseClient';

/**
 * Task 5: Data Import Utility
 */
export const importData = async (jsonData) => {
  const logs = [];
  let success = true;

  for (const [table, records] of Object.entries(jsonData)) {
    logs.push(`Importing ${records.length} records into ${table}...`);
    try {
      // In a real scenario, handle batches to avoid payload limits
      const { error } = await supabase
        .from(table)
        .upsert(records, { onConflict: 'id' });

      if (error) throw error;
      logs.push(`Successfully imported into ${table}.`);
    } catch (err) {
      success = false;
      logs.push(`Error importing into ${table}: ${err.message}`);
    }
  }

  return { success, logs };
};
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Task 4: Data Export Utility
 */
export const exportData = async (tables) => {
  const exportData = {};
  const logs = [];

  for (const table of tables) {
    logs.push(`Exporting table: ${table}...`);
    try {
      // Basic export, in a real scenario we'd use pagination
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) throw error;
      
      exportData[table] = data;
      logs.push(`Successfully exported ${count || data.length} records from ${table}.`);
    } catch (err) {
      logs.push(`Error exporting ${table}: ${err.message}`);
    }
  }

  // In a browser environment, we'd trigger a download.
  // For this environment, we just return the object.
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  return { success: true, url, logs, data: exportData };
};
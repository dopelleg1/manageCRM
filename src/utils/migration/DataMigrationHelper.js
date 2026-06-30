import { supabase } from '@/lib/customSupabaseClient';

/**
 * Utility for exporting and importing table data in chunks.
 * Migrates data to the development environment instance.
 */

const CHUNK_SIZE = 500;
const TABLES_TO_MIGRATE = [
  'agents',
  'telemarketing_contacts',
  'potential_activities',
  'potential_tobacconists',
  'properties',
  'commercial_activities',
  'appointments',
  'configurations'
];

export const exportData = async (oldClient, onProgress) => {
  console.log('[DataMigration] Starting data export...');
  const exportedData = {};

  for (const table of TABLES_TO_MIGRATE) {
    try {
      if (onProgress) onProgress(`Exporting ${table}...`);
      let allRows = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await oldClient
          .from(table)
          .select('*')
          .range(page * CHUNK_SIZE, (page + 1) * CHUNK_SIZE - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allRows = [...allRows, ...data];
          page++;
        } else {
          hasMore = false;
        }
      }
      exportedData[table] = allRows;
      console.log(`[DataMigration] Exported ${allRows.length} rows from ${table}`);
    } catch (err) {
      console.error(`[DataMigration] Failed to export table ${table}:`, err);
    }
  }

  return { success: true, data: exportedData };
};

export const importData = async (newClient, exportedData, onProgress) => {
  console.log('[DataMigration] Starting data import...');
  const results = {};
  const orderedTables = [...TABLES_TO_MIGRATE].sort((a, b) => (a === 'agents' ? -1 : b === 'agents' ? 1 : 0));

  for (const table of orderedTables) {
    const rows = exportedData[table];
    if (!rows || rows.length === 0) continue;

    if (onProgress) onProgress(`Importing ${table} (${rows.length} rows)...`);
    let importedCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      try {
        const { error } = await newClient.from(table).upsert(chunk, { ignoreDuplicates: true });
        if (error) throw error;
        importedCount += chunk.length;
      } catch (err) {
        console.error(`[DataMigration] Failed to import chunk in ${table}:`, err);
      }
    }
    results[table] = importedCount;
  }

  return { success: true, results };
};
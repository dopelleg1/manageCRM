import { supabase } from '@/lib/customSupabaseClient';

export class DataMigrationUtility {
  static tables = [
    'agents', 
    'telemarketing_contacts', 
    'potential_tobacconists', 
    'properties', 
    'commercial_activities', 
    'potential_activities', 
    'appointments', 
    'configurations', 
    'documents', 
    'assignment_logs', 
    'duplicate_deletion_logs', 
    'backups', 
    'password_change_log', 
    'super_admin_settings'
  ];

  static async exportData(onProgress) {
    const exportData = {};
    const report = { logs: [], counts: {} };

    for (const table of this.tables) {
      if (onProgress) onProgress(`Exporting ${table}...`);
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' });

        if (error) throw error;
        
        exportData[table] = data;
        report.counts[table] = data.length;
        report.logs.push(`SUCCESS: Exported ${data.length} records from ${table}.`);
      } catch (err) {
        report.logs.push(`ERROR: Failed to export ${table}: ${err.message}`);
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    return { success: true, url, report, data: exportData };
  }

  static async importData(jsonData, onProgress) {
    const report = { logs: [], success: true };

    for (const table of this.tables) {
      const records = jsonData[table];
      if (!records || records.length === 0) continue;

      if (onProgress) onProgress(`Importing ${records.length} records into ${table}...`);
      try {
        // Upsert in batches of 100 to prevent payload limits
        const BATCH_SIZE = 100;
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
          const batch = records.slice(i, i + BATCH_SIZE);
          const { error } = await supabase
            .from(table)
            .upsert(batch, { onConflict: 'id' });
            
          if (error) throw error;
        }
        report.logs.push(`SUCCESS: Imported ${records.length} records into ${table}.`);
      } catch (err) {
        report.success = false;
        report.logs.push(`ERROR: Failed importing ${table}: ${err.message}`);
      }
    }

    return report;
  }
}
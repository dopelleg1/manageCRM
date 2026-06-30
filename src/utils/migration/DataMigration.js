import { supabase } from '@/lib/customSupabaseClient';

/**
 * Task 3: Data Export Utility
 * Task 4: Data Import Utility
 * Handles exporting from current DB and importing to new DB in dependency order.
 */

const EXPORT_ORDER = [
  'agents',
  'configurations',
  'telemarketing_contacts',
  'potential_tobacconists',
  'potential_activities',
  'properties',
  'commercial_activities',
  'appointments',
  'documents',
  'assignment_logs',
  'duplicate_deletion_logs',
  'password_change_log',
  'backups',
  'super_admin_settings'
];

export class MigrationService {
  /**
   * Task 3: Export All Data
   */
  static async exportAllData(sourceClient = supabase) {
    const exportData = {};
    const manifest = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    console.log('Starting full data export...');
    
    for (const table of EXPORT_ORDER) {
      try {
        console.log(`Exporting ${table}...`);
        const { data, error } = await sourceClient
          .from(table)
          .select('*');
          
        if (error) throw error;
        
        exportData[table] = data || [];
        manifest.tables[table] = {
          recordCount: exportData[table].length,
          status: 'success'
        };
      } catch (err) {
        console.error(`Error exporting ${table}:`, err);
        manifest.tables[table] = {
          status: 'error',
          error: err.message
        };
      }
    }

    return {
      manifest,
      data: exportData
    };
  }

  /**
   * Task 4: Import All Data
   */
  static async importAllData(targetClient, exportPayload) {
    const { data: exportData, manifest } = exportPayload;
    const importReport = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    console.log('Starting full data import...');

    // Disable RLS might be needed, but assuming authenticated with Service Role or super admin
    for (const table of EXPORT_ORDER) {
      if (!exportData[table] || exportData[table].length === 0) {
        console.log(`Skipping ${table} - No data to import`);
        importReport.tables[table] = { status: 'skipped', count: 0 };
        continue;
      }

      try {
        console.log(`Importing ${exportData[table].length} records to ${table}...`);
        
        // Import in chunks to avoid payload size limits
        const chunkSize = 500;
        let imported = 0;
        
        for (let i = 0; i < exportData[table].length; i += chunkSize) {
          const chunk = exportData[table].slice(i, i + chunkSize);
          const { error } = await targetClient
            .from(table)
            .insert(chunk);
            
          if (error) throw error;
          imported += chunk.length;
        }

        importReport.tables[table] = {
          status: 'success',
          exportedCount: manifest.tables[table]?.recordCount || 0,
          importedCount: imported
        };
      } catch (err) {
        console.error(`Error importing ${table}:`, err);
        importReport.tables[table] = {
          status: 'error',
          error: err.message
        };
      }
    }

    return importReport;
  }
}
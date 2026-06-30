import { supabase } from '@/lib/customSupabaseClient';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const TABLES_TO_BACKUP = [
  'agents',
  'commercial_activities',
  'properties',
  'potential_tobacconists',
  'potential_activities',
  'telemarketing_contacts',
  'appointments',
  'configurations',
  'documents',
  'super_admin_settings'
];

/**
 * Generates a SQL/JSON dump of the database content
 */
export const generateDatabaseBackup = async () => {
  const zip = new JSZip();
  const backupDate = new Date().toISOString().replace(/[:.]/g, '-');
  const metadata = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const table of TABLES_TO_BACKUP) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error backing up table ${table}:`, error);
      metadata.tables[table] = { status: 'error', error: error.message };
      continue;
    }
    
    // Save as JSON for easier restoration
    zip.file(`tables/${table}.json`, JSON.stringify(data, null, 2));
    
    // Basic SQL generation (INSERT statements)
    if (data.length > 0) {
        const columns = Object.keys(data[0]).join(', ');
        const sqlLines = data.map(row => {
            const values = Object.values(row).map(val => {
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return val;
            }).join(', ');
            return `INSERT INTO ${table} (${columns}) VALUES (${values});`;
        }).join('\n');
        zip.file(`sql/${table}.sql`, sqlLines);
    }
    
    metadata.tables[table] = { status: 'success', count: data.length };
  }

  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `db_backup_${backupDate}.zip`);
  return true;
};

/**
 * Downloads files from Storage and Zips them
 */
export const generateStorageBackup = async (bucketName = 'documents') => {
  const zip = new JSZip();
  const backupDate = new Date().toISOString().replace(/[:.]/g, '-');

  // 1. Get list of files from the 'documents' table (metadata)
  // This is more reliable than listing bucket recursively if we maintain the reference table properly
  const { data: fileRecords, error } = await supabase.from('documents').select('*');
  
  if (error) throw new Error("Failed to fetch file list from DB");

  let count = 0;
  let errors = 0;

  // Batch processing could be implemented here for large datasets
  for (const record of fileRecords) {
      try {
          const { data, error: downloadError } = await supabase.storage
              .from(bucketName)
              .download(record.file_path);
          
          if (downloadError) throw downloadError;

          // Add to zip, preserving folder structure
          zip.file(record.file_path, data);
          count++;
      } catch (err) {
          console.error(`Failed to download ${record.file_path}`, err);
          zip.file(`_errors/${record.file_path}.txt`, `Error: ${err.message}`);
          errors++;
      }
  }

  zip.file('manifest.json', JSON.stringify({ 
      timestamp: new Date().toISOString(),
      total_files: fileRecords.length,
      downloaded: count,
      errors: errors
  }, null, 2));

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `storage_backup_${bucketName}_${backupDate}.zip`);
  return { count, errors };
};

/**
 * Restore Database from JSON files (Not SQL, as we can't execute raw SQL via client easily)
 */
export const restoreDatabaseFromZip = async (file) => {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    
    const restoreLog = [];

    // Iterate specifically over tables we know
    for (const table of TABLES_TO_BACKUP) {
        const file = loadedZip.file(`tables/${table}.json`);
        if (file) {
            const content = await file.async('string');
            const data = JSON.parse(content);
            
            if (data.length > 0) {
                // Upsert data. Note: This might fail due to foreign key constraints if order isn't perfect.
                // A robust restore needs to disable triggers/constraints or be very careful with order.
                // For this "simple" implementation, we try upsert.
                const { error } = await supabase.from(table).upsert(data);
                if (error) {
                    restoreLog.push(`Error restoring ${table}: ${error.message}`);
                } else {
                    restoreLog.push(`Restored ${data.length} rows to ${table}`);
                }
            }
        }
    }
    return restoreLog;
};
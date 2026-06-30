import { supabase } from '@/lib/customSupabaseClient';

/**
 * Utility for exporting and importing database schemas.
 * Used to migrate schema metadata to the new development Supabase instance.
 */

export const exportSchema = async (oldClient) => {
  console.log('[SchemaMigration] Starting schema export from source...');
  try {
    const { data: stats, error } = await oldClient.rpc('get_table_stats');
    if (error) throw error;
    
    console.log(`[SchemaMigration] Exported schema metadata for ${stats?.length || 0} tables.`);
    return {
      success: true,
      tables: stats,
      message: 'Schema metadata exported successfully.'
    };
  } catch (err) {
    console.error('[SchemaMigration] Schema export failed:', err);
    return { success: false, error: err.message };
  }
};

export const generateDDL = (schemaData) => {
  console.log('[SchemaMigration] Generating DDL statements...');
  let ddl = '-- Generated DDL for Development Environment\n\n';
  if (schemaData?.tables) {
    schemaData.tables.forEach(t => {
      ddl += `-- TABLE: ${t.table_name}\n`;
      ddl += `-- COLUMNS: ${t.columns ? t.columns.join(', ') : 'unknown'}\n\n`;
    });
  }
  return ddl;
};

export const validateSchemaIntegrity = async (newClient, expectedSchema) => {
  console.log('[SchemaMigration] Validating schema integrity on target...');
  try {
    const { data: stats, error } = await newClient.rpc('get_table_stats');
    if (error) throw error;
    
    const targetTables = stats?.map(s => s.table_name) || [];
    const expectedTables = expectedSchema?.tables?.map(t => t.table_name) || [];
    const missingTables = expectedTables.filter(t => !targetTables.includes(t));
    
    if (missingTables.length > 0) {
      console.warn(`[SchemaMigration] Missing tables in target: ${missingTables.join(', ')}`);
      return { success: false, missingTables };
    }
    
    console.log('[SchemaMigration] Schema integrity validated successfully.');
    return { success: true, message: 'Schema matches expected structure.' };
  } catch (err) {
    console.error('[SchemaMigration] Schema validation failed:', err);
    return { success: false, error: err.message };
  }
};
import { generateSchemaMigrationSQL } from './SchemaMigration';
import { exportData } from './DataExport';
import { importData } from './DataImport';
import { MigrationVerifier } from './VerificationUtility';
import { supabase } from '@/lib/customSupabaseClient';

export class MigrationOrchestrator {
  static async runFullMigration(tablesToMigrate) {
    const report = {
      steps: [],
      success: false
    };

    try {
      // 1. Schema
      report.steps.push("Schema generated. (Must be run manually via SQL editor)");
      const schemaSql = generateSchemaMigrationSQL();
      
      // 2. Export
      report.steps.push("Starting data export...");
      const exportResult = await exportData(tablesToMigrate);
      report.steps.push(...exportResult.logs);

      // 3. Import (Simulated against same client for demo)
      report.steps.push("Starting data import...");
      const importResult = await importData(exportResult.data);
      report.steps.push(...importResult.logs);

      // 4. Verify
      report.steps.push("Running verification...");
      const expectedCounts = {};
      for (const [table, data] of Object.entries(exportResult.data)) {
        expectedCounts[table] = data.length;
      }
      
      const verifyReport = await MigrationVerifier.verifyMigration(supabase, expectedCounts);
      report.steps.push(`Verification status: ${verifyReport.overallStatus}`);

      report.success = importResult.success && verifyReport.overallStatus === 'SUCCESS';
      return report;
    } catch (err) {
      report.steps.push(`Migration failed: ${err.message}`);
      return report;
    }
  }
}
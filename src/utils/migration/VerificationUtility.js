import { supabase } from '@/lib/customSupabaseClient';

/**
 * Task 6: Verification and Testing Script
 */

const TABLES_TO_VERIFY = [
  'agents',
  'telemarketing_contacts',
  'potential_tobacconists',
  'potential_activities',
  'properties',
  'commercial_activities',
  'appointments',
  'documents'
];

export class MigrationVerifier {
  static async verifyMigration(newClient = supabase, originalCounts = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      connection: false,
      tables: {},
      auth: false,
      overallStatus: 'PENDING'
    };

    try {
      // 1. Test Connection & Data Access
      const { data: testData, error: testError } = await newClient.from('agents').select('id').limit(1);
      if (testError) throw testError;
      report.connection = true;

      // 2. Verify Table Counts
      let allCountsMatch = true;
      for (const table of TABLES_TO_VERIFY) {
        try {
          const { count, error } = await newClient
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (error) throw error;

          const originalCount = originalCounts[table] || 0;
          const isMatch = count === originalCount;
          if (!isMatch && originalCounts[table] !== undefined) {
            allCountsMatch = false;
          }

          report.tables[table] = {
            status: isMatch ? 'PASS' : 'WARNING',
            currentCount: count,
            expectedCount: originalCount
          };
        } catch (err) {
          report.tables[table] = { status: 'FAIL', error: err.message };
          allCountsMatch = false;
        }
      }

      // 3. Test Auth (Checking if current session is active)
      const { data: sessionData } = await newClient.auth.getSession();
      report.auth = !!sessionData?.session;

      report.overallStatus = (report.connection && allCountsMatch) ? 'SUCCESS' : 'NEEDS_REVIEW';
      return report;
    } catch (err) {
      report.overallStatus = 'FAILED';
      report.error = err.message;
      return report;
    }
  }
}
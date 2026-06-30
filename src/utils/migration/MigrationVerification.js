import { supabase } from '@/lib/customSupabaseClient';
import { DataMigrationUtility } from './DataMigrationUtility';

export class MigrationVerification {
  static async runVerification(oldCounts = null) {
    const report = {
      timestamp: new Date().toISOString(),
      tables: {},
      functions: {},
      overallStatus: 'PENDING',
      logs: []
    };

    let allPassed = true;

    // 1. Check Tables and Record Counts
    for (const table of DataMigrationUtility.tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) throw error;

        let status = 'PASS';
        if (oldCounts && oldCounts[table] !== undefined) {
          if (count !== oldCounts[table]) {
            status = 'WARNING';
            allPassed = false;
          }
        }

        report.tables[table] = {
          exists: true,
          count: count,
          expectedCount: oldCounts ? oldCounts[table] : 'Unknown',
          status
        };
      } catch (err) {
        report.tables[table] = { exists: false, error: err.message, status: 'FAIL' };
        allPassed = false;
        report.logs.push(`Missing or inaccessible table: ${table}`);
      }
    }

    // 2. Check Database Functions by invoking a safe one
    try {
      const { error } = await supabase.rpc('get_my_role');
      report.functions['get_my_role'] = error ? 'FAIL' : 'PASS';
      if (error && error.code !== 'PGRST202') allPassed = false; // PGRST202 is function not found
    } catch (e) {
      report.functions['get_my_role'] = 'FAIL';
    }

    report.overallStatus = allPassed ? 'SUCCESS' : 'NEEDS_REVIEW';
    return report;
  }
}
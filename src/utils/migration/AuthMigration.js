import { supabase } from '@/lib/customSupabaseClient';

/**
 * Task 5: Auth Migration Utility
 * Utility to verify and map auth users to agents table.
 */

export class AuthMigrationService {
  static async migrateUsers(targetAdminClient, sourceUsers) {
    const report = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const user of sourceUsers) {
      try {
        // 1. Create user in new Supabase Auth
        const { data: authData, error: authError } = await targetAdminClient.auth.admin.createUser({
          id: user.id, // Keep the same UUID to preserve foreign keys
          email: user.email,
          email_confirm: true,
          password: 'TemporaryPassword123!', // Must be changed on first login
          user_metadata: user.raw_user_meta_data
        });

        if (authError) throw authError;

        // 2. Ensure mapping exists in Agents table
        const { error: agentError } = await targetAdminClient
          .from('agents')
          .upsert({
            id: user.id,
            email: user.email,
            name: user.raw_user_meta_data?.name || user.email.split('@')[0],
            role: user.raw_user_meta_data?.role || 'agent'
          });

        if (agentError) throw agentError;

        report.success++;
      } catch (err) {
        console.error(`Failed to migrate user ${user.email}:`, err);
        report.failed++;
        report.errors.push({ email: user.email, error: err.message });
      }
    }

    return report;
  }
}
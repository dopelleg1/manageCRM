/**
 * DEVELOPMENT ENVIRONMENT CONFIGURATION
 * 
 * WARNING: This configuration is for the DEVELOPMENT environment ONLY (dev.studiobpitalia.it).
 * It is completely isolated from the PRODUCTION environment (manage.studiobpitalia.it).
 * 
 * Do NOT use production credentials here.
 * All testing, migrations, and schema changes should be performed here first.
 */

export const devEnvironment = {
  isDevelopment: true,
  environment: 'dev.studiobpitalia.it',
  
  // New Development Supabase Instance Credentials
  supabaseUrl: 'https://nhrhjdjfjrsghqmwoewn.supabase.co',
  supabaseAnonKey: 'sb_publishable_xMPmTmx8ME4afkWz4vvEbA_a9xC2j_x',
  
  // Feature Flags for Dev
  features: {
    enableMigrationTools: true,
    enableDetailedLogging: true,
    mockExternalServices: true
  }
};

export default devEnvironment;
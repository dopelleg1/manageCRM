import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bukfxhtbkgqzlqsiukwl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2Z4aHRia2dxemxxc2l1a3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDU1ODQsImV4cCI6MjA3NDQ4MTU4NH0.LyrSvfJw91gAZ-Go5OGKV2f2ZCbhh3ZjUXxrwL75-qY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'do.pel@tiscali.it',
    password: 'Lbh1108a!'
  });
  
  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }
  
  console.log('User Authenticated. UID:', authData.user.id);
  console.log('Role in user metadata:', authData.user.user_metadata);
  
  const tables = [
    'agents',
    'telemarketing_contacts',
    'potential_tobacconists',
    'super_admin_settings',
    'properties',
    'commercial_activities',
    'potential_activities',
    'appointments',
    'configurations',
    'password_change_log',
    'documents',
    'assignment_logs',
    'duplicate_deletion_logs',
    'backups'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
    console.log(`Table ${table} - Count: ${data ? data.length : 0}, Error:`, error ? error.message : 'none');
  }
}

run();

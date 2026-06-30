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
  
  const userId = authData.user.id;
  console.log('User Authenticated. UID:', userId);
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', userId)
    .single();
    
  console.log('Single agent response:', { data, error });
}

run();

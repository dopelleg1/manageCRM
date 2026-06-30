import { createClient } from '@supabase/supabase-js';

const devUrl = 'https://nhrhjdjfjrsghqmwoewn.supabase.co';
const devAnonKey = 'sb_publishable_xMPmTmx8ME4afkWz4vvEbA_a9xC2j_x';
const email = 'do.pel@tiscali.it';
const password = 'Lbh1108a!';

async function run() {
  console.log(`Testing dev instance: ${devUrl}...`);
  const supabase = createClient(devUrl, devAnonKey);
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      console.log(`❌ Dev Auth failed: ${authError.message}`);
    } else {
      console.log(`✅ Dev Auth success! User UID: ${authData.user.id}`);
      
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*');
        
      console.log(`agents response count:`, agentsData ? agentsData.length : null);
      console.log(`agents error:`, agentsError);
    }
  } catch (err) {
    console.error(`💥 Error:`, err.message);
  }
}

run();

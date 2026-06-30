// Mock browser globals before loading client
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const key in storage) delete storage[key]; }
};
global.window = { location: { origin: 'http://localhost:3000', hash: '' } };

process.env.VITE_DATABASE_PROVIDER = 'mysql';
process.env.VITE_API_URL = 'http://localhost:3001';

async function test() {
  const { supabase } = await import('../src/lib/customSupabaseClient.js');
  console.log('🧪 Starting Adapter Verification Test (Node-emulated Browser)...');
  
  // 1. Try to log in
  console.log('\n🔑 1. Testing auth.signInWithPassword...');
  const { data: session, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'do.pel@tiscali.it',
    password: 'Lbh1108a!'
  });
  
  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
    return;
  }
  console.log('✅ Login successful! Session token generated.');
  
  // 2. Try to query agents
  console.log('\n🔍 2. Testing database select on "agents"...');
  const { data: agents, error: selectError } = await supabase
    .from('agents')
    .select('*');
    
  if (selectError) {
    console.error('❌ Select failed:', selectError.message);
    return;
  }
  console.log(`✅ Select successful! Found ${agents.length} agents:`, agents);
  
  // 3. Try to insert a configuration record
  console.log('\n✍️ 3. Testing database insert on "configurations"...');
  const configId = 'test-config-id-12345';
  const { data: insertResult, error: insertError } = await supabase
    .from('configurations')
    .insert({
      id: configId,
      type: 'TEST_SETTING',
      value: 'TEST_VALUE'
    });
    
  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    return;
  }
  console.log('✅ Insert successful!');
  
  // 4. Try to select the configuration record
  console.log('\n🔍 4. Testing database select with filter...');
  const { data: configs, error: filterError } = await supabase
    .from('configurations')
    .select('*')
    .eq('id', configId);
    
  if (filterError) {
     console.error('❌ Filtered select failed:', filterError.message);
     return;
  }
  console.log('✅ Filtered select successful! Record fetched:', configs);
  
  // 5. Try to delete the configuration record
  console.log('\n🗑️ 5. Testing database delete...');
  const { data: deleteResult, error: deleteError } = await supabase
    .from('configurations')
    .delete()
    .eq('id', configId);
    
  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    return;
  }
  console.log('✅ Delete successful!');
  
  console.log('\n🎉 All Adapter Verification Tests Passed Successfully!');
}

test();

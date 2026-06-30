import { supabase } from '@/lib/customSupabaseClient';

export const testConnection = async () => {
  console.log('[ConnectionTest] Starting connection tests to DEV instance...');
  const results = { connected: false, authWorks: false, crudWorks: false, details: [] };

  try {
    const { data: ping, error: pingErr } = await supabase.from('configurations').select('id').limit(1);
    results.connected = !pingErr;
    results.details.push(`Basic Connectivity: ${!pingErr ? 'PASS' : 'FAIL - ' + pingErr?.message}`);

    const { data: { session }, error: authErr } = await supabase.auth.getSession();
    results.authWorks = !authErr;
    results.details.push(`Session Management: ${!authErr ? 'PASS' : 'FAIL - ' + authErr?.message}`);

    const { data: agents, error: crudErr } = await supabase.from('agents').select('*').limit(1);
    results.crudWorks = !crudErr;
    results.details.push(`Data Access (Agents): ${!crudErr ? 'PASS' : 'FAIL - ' + crudErr?.message}`);

    return { success: true, results };
  } catch (err) {
    results.details.push(`Exception: ${err.message}`);
    return { success: false, results };
  }
};
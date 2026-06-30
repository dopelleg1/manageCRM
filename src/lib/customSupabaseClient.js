import { createClient } from '@supabase/supabase-js';
import devEnvironment from '@/config/devEnvironment';

const supabaseUrl = devEnvironment.supabaseUrl;
const supabaseAnonKey = devEnvironment.supabaseAnonKey;

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};


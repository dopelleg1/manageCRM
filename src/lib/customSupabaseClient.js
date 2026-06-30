import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bukfxhtbkgqzlqsiukwl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2Z4aHRia2dxemxxc2l1a3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDU1ODQsImV4cCI6MjA3NDQ4MTU4NH0.LyrSvfJw91gAZ-Go5OGKV2f2ZCbhh3ZjUXxrwL75-qY';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};


import { supabase } from '@/lib/customSupabaseClient';

/**
 * Esegue una verifica rapida sulla tabella potential_activities
 * per confermare la struttura dei campi data.
 */
export async function verifyPotentialActivitiesSchema() {
  console.log("🔍 Verifica Schema 'potential_activities' in corso...");
  
  const { data, error } = await supabase
    .from('potential_activities')
    .select('id, created_at, data_richiamo, nome, type')
    .limit(1);

  if (error) {
    console.error("❌ Errore durante la verifica:", error.message);
    return { success: false, error };
  }

  if (data && data.length > 0) {
    const record = data[0];
    console.log("✅ Record campione trovato:", record);
    console.log("ℹ️ Formato 'created_at':", record.created_at);
    console.log("ℹ️ Formato 'data_richiamo':", record.data_richiamo);
    return { success: true, record };
  } else {
    console.warn("⚠️ Nessun record trovato nella tabella 'potential_activities'.");
    return { success: true, record: null };
  }
}
# Report Analisi Tecnica: Flusso Creazione Utente

## 1. Metodo di Creazione Identificato

L'analisi del file `src/pages/AgentsPage.jsx` rivela che la creazione dell'utente **non avviene direttamente tramite le API client-side** di Supabase (es. `supabase.auth.signUp`), ma viene delegata a una **Supabase Edge Function**.

### Funzione Chiamata
Il frontend invoca esplicitamente la funzione server-side denominata `create-user`.

**File:** `src/pages/AgentsPage.jsx` (Riga ~147)
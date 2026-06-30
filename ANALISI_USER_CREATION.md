# Analisi Flusso Creazione Utente (User Creation Flow)

## 1. Localizzazione
La creazione di nuovi utenti (Agenti, Admin, ecc.) è gestita tramite una **Supabase Edge Function** denominata `create-user`.
Questa funzione viene invocata dal frontend (`AgentsPage.jsx`) quando un amministratore compila il form "Nuovo Utente".

**Endpoint:** `supabase/functions/create-user/index.ts`

## 2. Analisi Step-by-Step (Comportamento Implementato)

### A. Creazione in Supabase Auth
La funzione utilizza il client `supabaseAdmin.auth.admin.createUser` per creare l'identità nel sistema di autenticazione.
- **Metodo:** `admin.createUser({ email, password, ... })`
- **Parametri:** Email, Password (provvisoria), User Metadata (nome, ruolo).

### B. Gestione Conferma Email (`email_confirmed_at`)
- **Stato Precedente (Inferito):** Di default, `createUser` crea l'utente con `email_confirmed_at: null` se non specificato diversamente. Questo impedisce il login immediato se la conferma email è attiva nel progetto Supabase.
- **Nuova Implementazione:** È stato aggiunto il parametro `email_confirm: true`. Questo imposta automaticamente il campo `email_confirmed_at` al timestamp corrente, bypassando la necessità di cliccare su un link via email.

### C. Impostazione Password Iniziale
La password viene impostata direttamente durante la creazione (`admin.createUser`) utilizzando la password fornita dall'admin nel form di creazione. L'utente può loggarsi immediatamente con questa password.

### D. Creazione Profilo (Tabella `public.agents`)
Dopo aver creato l'utente in Auth, la funzione inserisce (o aggiorna) un record corrispondente nella tabella `public.agents`.
- Questo passaggio è critico perché le policy RLS e la logica dell'applicazione si basano sulla presenza dell'utente in questa tabella.
- **Check di Sicurezza:** La funzione verifica prima che il chiamante sia un `admin` o `super_admin`.

## 3. Confronto Comportamento

| Funzionalità | Comportamento Standard/Precedente | Comportamento Modificato (Fix) |
| :--- | :--- | :--- |
| **Login Immediato** | **NO** (Richiedeva conferma email) | **SÌ** (Utente auto-confermato) |
| **Timestamp Conferma** | `null` | `NOW()` |
| **Gestione Ruoli** | Ruolo salvato in metadata | Ruolo salvato in metadata + tabella `agents` |
| **Sync Database** | Possibile disallineamento se trigger assente | Inserimento esplicito in `agents` |

## 4. Modifiche Applicate (Fix)

La Edge Function `create-user` è stata riscritta per includere esplicitamente:
1.  **Auto-Conferma:** Aggiunto `email_confirm: true` alla chiamata di creazione.
2.  **Sincronizzazione Robusta:** Logica per inserire il profilo in `agents` subito dopo la creazione dell'Auth User.
3.  **Gestione Errori:** Migliorata la gestione degli errori per evitare stati inconsistenti.

Questo garantisce che ogni utente creato da un amministratore (sia esso Agente o Admin) sia immediatamente operativo.
# Analisi dell'Assegnazione Agenti - Telemarketing

Questo documento fornisce un'analisi dettagliata della funzionalità di assegnazione degli agenti all'interno dei moduli `TelemarketingPage.jsx` e `RecordDetailModal.jsx`.

## 1. Campo di Assegnazione e Archiviazione (Database)

Nel database Supabase, l'assegnazione dell'agente è gestita tramite la tabella `telemarketing_contacts`.

*   **Campo:** `agente_id`
*   **Tipo:** `uuid`
*   **Relazione:** Chiave esterna (Foreign Key) che punta a `public.agents(id)`.
*   **Contesto aggiuntivo:** Esiste anche un campo `operatore_id` (uuid, FK verso agents) utilizzato per tracciare chi ha originariamente gestito/creato il contatto, ma l'assegnazione principale per la lavorazione successiva avviene su `agente_id`.

## 2. Analisi del Componente UI (`RecordDetailModal.jsx`)

L'assegnazione all'interno del `RecordDetailModal.jsx` viene gestita tramite il sub-componente interno `<AgentSelector />`.

### Implementazione del Componente
Il componente valuta i permessi dell'utente (tramite `useAuth`) e determina se renderizzare un selettore interattivo o un campo in sola lettura.
Per i record di tipo `Telemarketing`, l'interfaccia interattiva è abilitata.
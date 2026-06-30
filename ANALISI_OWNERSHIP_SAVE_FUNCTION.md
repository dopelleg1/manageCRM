# ANALISI: Logica di Ownership e Salvataggio su `potential_activities`

Questo report documenta il flusso di salvataggio dei record e la logica di controllo dei permessi (ownership) che causa il fallimento quando un agente tenta di riassegnare un proprio record a un altro agente.

---

## 1. Funzione di Salvataggio (Location & Implementation)

Il salvataggio avviene nel frontend tramite il componente universale del modale di dettaglio.

*   **File:** `src/components/calendar/RecordDetailModal.jsx`
*   **Funzioni coinvolte:** `handleSave()` e `proceedWithSave()`

**Flusso Completo:**
1. L'utente clicca il pulsante "Salva".
2. Viene invocata la funzione `handleSave()`, che effettua i controlli preliminari (duplicati, campi configurabili mancanti, mostra l'alert modale del cambio agente se necessario).
3. Superati i check (o dopo la conferma nel modale di cambio agente), viene invocata `proceedWithSave()`.
4. `proceedWithSave()` controlla la variabile `canEditRecord`. Se falsa, blocca il salvataggio.
5. Se vera, prepara l'oggetto rimuovendo `recordType` e chiama `supabase.from(tableName).update(cleanData)`.
6. Al termine dell'operazione asincrona, aggiorna il context globale (chiamando `updateRecord` o `deleteRecord` in `DataContext.jsx`).

**Codice estratto (`proceedWithSave`):**
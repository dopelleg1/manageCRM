# Analisi Approfondita: Gestione dello Stato e Paginazione

Di seguito il rapporto dettagliato sul comportamento dello stato, della paginazione e sui problemi di reset automatico rilevati all'interno dei componenti analizzati.

---

## 1. Analisi `TelemarketingPage.jsx`

*   **Variabile di state per la pagina corrente:**
    Il numero di pagina è gestito dall'oggetto di stato `pagination` (nello specifico dalla proprietà `pagination.pageIndex`).
    *Codice:* `const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });`

*   **Quanti `useEffect` ci sono e il loro scopo:**
    Ci sono esattamente **3 `useEffect`** nel componente:
    1.  *Ripristino (Mount):* Legge il `localStorage` tramite `loadState()` al montaggio del componente e popola gli state (`searchTerm`, `pagination`, `sorting`, `columnFilters`, `expandedRows`), impostando infine `isRestored` a `true`.
    2.  *Salvataggio (Update):* Resta in ascolto dei cambiamenti su `searchTerm`, `pagination`, `sorting`, `columnFilters`, `expandedRows` e salva tutto in `localStorage` chiamando `saveState()`. Si attiva solo se `isRestored` è `true`.
    3.  *Controllo Bozze (Mount/Update):* Controlla tramite `getFormData` se c'è una bozza non salvata (in `sessionStorage`) e, in caso affermativo, mostra un toast per permettere all'utente di riprendere l'inserimento.

*   **Quale `useEffect` resetta currentPage?**
    Nessun `useEffect` all'interno di questo file resetta esplicitamente la `currentPage` (ovvero `pagination.pageIndex`). Il reset avviene indirettamente a causa di un componente figlio (`DataTable`), che modifica lo stato chiamando la funzione `setPagination`.

*   **Caricamento dei dati (Fetch):**
    Il fetch non è gestito direttamente nel componente ma dall'hook di contesto **`useData()`**, che fornisce l'array `telemarketing` (i dati), il booleano `loading` e la funzione `fetchAllData`.
    *Codice:* `const { telemarketing, loading, fetchAllData } = useData();`

*   **Pulsanti di navigazione pagina:**
    Sono incapsulati all'interno del componente `<DataTable />`. Al componente DataTable vengono passati `pagination={pagination}` e `onPaginationChange={setPagination}`. Quando l'utente clicca "Successivo", DataTable chiama `setPagination` con il nuovo `pageIndex`.

*   **Cosa succede al montaggio?**
    Al montaggio si innesca il primo `useEffect` che chiama `loadState()`. Se ci sono dati in `localStorage`, gli stati (incluso `pagination`) vengono sovrascritti con i valori ripristinati, e `isRestored` passa da `false` a `true`.

---

## 2. Analisi `CommercialActivitiesPage.jsx`

*   **Variabile di state per la pagina corrente:**
    Anche qui, la pagina è gestita dallo stato `pagination` (proprietà `pagination.pageIndex`).
    *Codice:* `const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });`

*   **Quanti `useEffect` ci sono e il loro scopo:**
    Ci sono esattamente **3 `useEffect`** nel componente:
    1.  *Ripristino (Mount):* Esegue `loadState()` e reidrata `searchTerm`, `pagination`, `sorting`, `columnFilters`, `expandedRows`. Segna `isRestored` a `true`.
    2.  *Salvataggio (Update):* Monitora gli stati elencati sopra e invoca `saveState()` ogni volta che uno di essi cambia (se `isRestored` è `true`).
    3.  *Controllo Bozze:* Utilizza `getFormData('commercial_activities', 'new')` per individuare bozze in sospeso e mostra il toast corrispondente.

*   **Quale `useEffect` resetta currentPage?**
    Come per Telemarketing, non c'è un `useEffect` interno che azzera la pagina. Il reset è causato dalla reazione di `<DataTable />` ai nuovi dati.

*   **Caricamento dei dati (Fetch):**
    Viene gestito sempre dall'hook di contesto **`useData()`**, che espone l'array `activities`, `loading` e `fetchAllData`.

*   **Pulsanti di navigazione pagina:**
    Sono gestiti all'interno di `<DataTable />`, che riceve in pasto l'oggetto `pagination` e la funzione `setPagination`.

*   **Cosa succede al montaggio?**
    Inizializza lo stato leggendo il `localStorage` tramite il primo `useEffect`, ripristinando la visualizzazione all'ultima visita dell'utente.

---

## 3. Problema del Reset Automatico (Il mistero dei 2 secondi)

*   **La causa ESATTA del reset:**
    La colpa del reset a pagina 1 (o index 0) non risiede in una riga specifica di questi due file, ma nel comportamento predefinito del componente `<DataTable />` (quasi certamente basato su TanStack React Table o libreria simile).
    Quando `<DataTable />` riceve un **nuovo array di dati** (una nuova reference in memoria), per impostazione predefinita azzera la paginazione, i filtri e l'ordinamento (comportamento noto come `autoResetPageIndex: true`).

*   **Quale useEffect/dipendenza causa il re-render e il reset?**
    Il reset avviene perché l'array dei dati cambia.
    Nel file `CommercialActivitiesPage`, l'hook `useMemo` ricalcola `processedActivities` non appena l'array `activities` (dal context) si aggiorna dopo la fine del fetch (circa 2 secondi). L'hook `useClientSearch` produce poi un nuovo array `filteredData`. 
    Quando `<DataTable data={filteredData} />` riceve questo nuovo array, scatta il reset interno alla tabella, che chiama automaticamente la prop `onPaginationChange` passando `{ pageIndex: 0, pageSize: 10 }`.

*   **Il localStorage viene letto e sovrascritto?**
    1.  Sì, il `localStorage` **viene letto** al montaggio (1° `useEffect`). In quel momento l'app imposta correttamente la pagina (es. pagina 3).
    2.  Sì, il `localStorage` **viene sovrascritto** in modo errato! Quando il `<DataTable />` azzera la pagina dopo 2 secondi, chiama `setPagination({ pageIndex: 0 })`. Questo cambiamento dello stato locale attiva il 2° `useEffect` (quello di salvataggio).
    3.  L'`useEffect` di salvataggio esegue `saveState(...)` **sovrascrivendo** la pagina 3 nel `localStorage` con la pagina 1.

*   **C'è un conflitto?**
    Esiste un enorme conflitto: il sistema ripristina la pagina corretta (Pagina 3), poi i dati dal server finiscono di caricare, la tabella pensa *"I dati sono cambiati, torno a pagina 1!"* e infine il tuo custom hook sovrascrive innocentemente il salvataggio precedente con "Pagina 1", perdendo per sempre lo stato.

---

## 4. Flusso Temporale Completo del Bug

1.  **Azione:** L'utente si trova a pagina 3 e applica dei filtri. Il 2° `useEffect` salva tutto in `localStorage`.
2.  **Navigazione/Ricaricamento (0 secondi):** L'utente cambia pagina o fa refresh. Il componente si monta.
3.  **Lettura (0.1 secondi):** Il 1° `useEffect` legge dal `localStorage`, vede che eravamo a pagina 3, ed esegue `setPagination({ pageIndex: 2 })`. Segna `isRestored = true`. Il componente mostra pagina 3 (con dati vuoti o con cache iniziale).
4.  **Fetch dei Dati (0 - 2 secondi):** Dietro le quinte, `useData()` interroga Supabase e ottiene i dati aggiornati dal database.
5.  **Re-render (~2 secondi):** Arrivano i dati definitivi. `activities` cambia. `useMemo` ricalcola `processedActivities` e `filteredData`.
6.  **Reset automatico della Tabella:** `<DataTable />` rileva che la prop `data` ha una nuova reference. Il suo motore interno scatta: *"Attenzione, dati cambiati! Torno alla prima pagina."* e invoca autonomamente la funzione `setPagination({ pageIndex: 0, pageSize: 10 })`.
7.  **Aggiornamento di Stato Errato:** Lo stato `pagination` di React passa bruscamente a pagina 1.
8.  **Sovrascrittura Letale:** Il 2° `useEffect` vede che `pagination` è cambiato (mentre `isRestored` è `true`), entra in azione e chiama `saveState()`. Il localStorage viene sovrascritto e salvato a Pagina 1, distruggendo la persistenza che si voleva ottenere.
9.  **Risultato Visuale:** L'utente, che per 2 secondi ha visto pagina 3, viene improvvisamente "teletrasportato" a pagina 1.

---

## Proposta di Risoluzione (Da implementare sul codice della DataTable)

Il problema non si risolve bloccando il localStorage in questi due file, ma impedendo a `<DataTable />` di resettare autonomamente lo stato della pagina.

**Soluzione Consigliata:**
Nel componente `src/components/ui/data-table.jsx`, devi modificare l'istanziazione di TanStack Table (`useReactTable`).
Bisogna aggiungere un flag specifico per disabilitare l'auto-reset quando i dati cambiano:
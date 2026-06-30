# ANALISI CONTROLLI TELEFONO - Tabella contacts (Potenziali Venditori)

## STATO DELLA TABELLA
- **Esiste/Non esiste in Supabase:** **NON ESISTE**. Analizzando lo schema del database fornito, non vi è alcuna tabella nominata `contacts` o `potential_sellers`. I "Potenziali Venditori" nel sistema reale sembrano essere mappati all'interno della tabella `potential_activities` (con colonna `type` = 'venditore'/'acquirente'). Esiste tuttavia una pagina React `PotentialSellersPage.jsx` che tenta erroneamente di interrogare una tabella `potential_sellers`. Esiste inoltre la tabella `telemarketing_contacts` che gestisce i contatti di base. L'analisi che segue si basa sulle validazioni del campo "telefono" applicate a livello generale di codice per le entità di tipo "contatto/venditore".
- **Numero colonne:** N/A (Tabella non presente)
- **Colonne principali:** N/A

---

## Campo phone - Controlli applicati:

### A) VALIDAZIONI FRONTEND (React)
- **Componenti che gestiscono contacts:** `RecordDetailModal.jsx`, `PotentialSellersPage.jsx`.
- **Validazioni applicate al campo phone (Inserimento manuale UI):** Non ci sono validazioni rigide o regex bloccanti applicate direttamente sull'input manuale nei moduli React. L'input utilizza semplicemente `type="tel"`, che delega la validazione basilare al browser ma accetta praticamente qualsiasi stringa.
- **Validazioni applicate al campo phone (Importazione CSV):** In `src/utils/csvImportService.js`, la funzione `parsePhoneNumber` applica un controllo più severo.
- **Regex utilizzate:** 
  - Rimozione caratteri in Import: `/\D/g` (sostituisce tutto ciò che non è un numero).
  - Rimozione caratteri in Controllo Duplicati: `/[^0-9+]/g` (mantiene solo numeri e il segno +).
- **Lunghezza minima/massima:** 
  - Nell'UI: Nessun limite imposto (Né `minLength` né `maxLength`).
  - Nell'Importazione CSV (`parsePhoneNumber`): Accetta **esattamente** 10 cifre, oppure **esattamente** 13 cifre se inizia con '0039'. Altrimenti scarta il numero restituendo una stringa vuota.
- **Caratteri consentiti:** Numeri, spazi, trattini e `+` (nella UI). In fase di check duplicati vengono ripuliti.
- **Obbligatorio/Facoltativo:** Nella UI l'inserimento è generalmente facoltativo e non blocca il salvataggio se vuoto (salvo configurazioni specifiche passate tramite validatori aggiuntivi che qui non appaiono rigidi sul telefono).

### B) CONTROLLI BACKEND (Supabase)
Essendo la tabella `contacts` o `potential_sellers` inesistente, prendiamo a riferimento i campi `telefono` delle tabelle affini (es. `potential_activities`, `telemarketing_contacts`).
- **Constraints sulla colonna phone:** Nessun constraint nativo a livello di database.
- **Tipo di dato:** `text`
- **Nullable/NOT NULL:** `Nullable` (Accetta valori NULL)
- **Unique constraint:** **NO**. Il database permette l'inserimento di valori duplicati.
- **Check constraints:** **NO**. Nessun check constraint che limiti lunghezza o formato a livello SQL.

### C) TRIGGER DATABASE
- **Lista trigger sulla tabella contacts:** Nessuno.
- **Trigger specifici per il campo phone:** Nessuno.
- **Azioni eseguite dai trigger:** N/A.

### D) POLICY RLS
- **Policy sulla tabella contacts:** N/A. (Sulle tabelle affini ci sono policy di SELECT/INSERT/UPDATE basate su `agente_id` e ruoli).
- **Policy specifiche per il campo phone:** Nessuna policy Row Level Security è applicata in modo granulare o condizionale per limitare o validare il contenuto della singola colonna `telefono`.
- **Restrizioni applicate:** Nessuna limitazione di lettura/scrittura basata sul valore del telefono.

### E) FUNZIONI CUSTOM
- **Funzioni Supabase che validano phone:** Nessuna funzione PL/pgSQL che effettua validazione di formato. Esiste la funzione `get_duplicate_groups` che aiuta a *identificare* raggruppamenti di duplicati esistenti, ma non li previene all'inserimento.
- **Funzioni JavaScript che validano phone:** 
  - `src/hooks/useDuplicatePhoneCheck.js`: Non valida la correttezza del formato, ma ne normalizza la stringa (`replace(/[^0-9+]/g, '')`) ed esegue una query asincrona per cercare lo stesso numero nel DB per mostrare un *Warning* visuale. Non blocca il salvataggio.
  - `src/utils/csvImportService.js -> parsePhoneNumber(value)`: Valida e formatta in modo hard (richiede 10 cifre o prefisso 0039).
- **Logica di controllo duplicati:** Affidata unicamente all'UI tramite il componente `DuplicatePhoneWarning.jsx` e `DuplicatePhoneModal.jsx`. Se viene rilevato un duplicato (dopo debouncing di 500ms), l'utente viene avvisato, ma se sceglie di procedere o ignora l'avviso, il backend salva comunque il record duplicato.

### F) ALTRE LIMITAZIONI
- **Controlli di formato:** Presenti solo durante l'importazione CSV. Assenti nel caricamento manuale.
- **Controlli di duplicazione:** Asincroni, visivi (UI), ma **non bloccanti**. Il salvataggio procede anche in caso di duplicato ("Ghost duplicate detected - proceeding with save despite warning" in `RecordDetailModal.jsx`).
- **Validazioni asincrone:** Il controllo duplicati (hook `useDuplicatePhoneCheck`) interroga il DB ad ogni modifica dell'input (con debounce).
- **Messaggi di errore:**
  - Nel form (Warning): `"⚠️ Questo numero di telefono è già registrato Appartiene a: [Nome]"`.
  - Nell'import: `"Formato telefono non valido (Richiesto: 10 cifre o 0039+13 cifre)"`.

---

## CONCLUSIONI
- **Riepilogo dei controlli applicati:** La gestione del campo telefono è altamente disomogenea. Durante le importazioni massive, i numeri subiscono una validazione rigida e vengono scartati se non rispettano le 10 o 13 cifre. Viceversa, l'inserimento manuale da UI non ha praticamente filtri, accettando stringhe di qualsiasi tipo e lunghezza.
- **Eventuali gap di validazione:** 
  1. **Incoerenza tra flussi:** L'Import è rigido, il Form è permissivo.
  2. **Mancanza di barriere DB:** L'assenza di un constraint `UNIQUE` sul backend rende il sistema vulnerabile a race conditions o ad inserimenti tramite API/script che aggirano l'interfaccia React, sporcando il database con duplicati.
  3. **Tabella Fantasma:** La UI in `PotentialSellersPage.jsx` tenta di scrivere su `potential_sellers`, ma la tabella non esiste nel database (generando errori in produzione per quel modulo specifico).
- **Raccomandazioni:** 
  1. **Uniformare le Validazioni:** Implementare una libreria di validazione numeri telefonici (es. `libphonenumber-js`) o usare un pattern regex condiviso sia per il modulo form che per l'importatore CSV.
  2. **Protezione Backend:** Se i duplicati non sono tollerabili per il business, introdurre un vincolo `UNIQUE` a livello di Supabase ed intercettare l'errore in React.
  3. **Risolvere la Tabella Mancante:** Correggere `PotentialSellersPage.jsx` affinché punti a `potential_activities` con tipo `venditore`, come strutturato nel DB.
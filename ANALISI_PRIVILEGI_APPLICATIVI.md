# ANALISI COMPLETA - Gestione dei privilegi applicativi per i 4 ruoli utente

Questo documento fornisce un'analisi strutturata e dettagliata della gestione dei privilegi nel sistema CRM (Customer Relationship Management) per i 4 ruoli principali: **Agenti**, **Telemarketing**, **Admin**, **Super Admin**.

---

## A) LE 5 TABELLE PRINCIPALI DEL SISTEMA

L'analisi del database Supabase e del codice sorgente ha identificato le seguenti 5 tabelle come core del sistema applicativo:

1. **`properties` (Immobili)**
   - **Descrizione**: Gestisce il portafoglio immobiliare, inclusi dettagli, proprietario e assegnazione.
   - **Colonne**: 29
   - **Relazioni**: `agente_id` -> `agents(id)`

2. **`commercial_activities` (Attività Commerciali)**
   - **Descrizione**: Gestisce le attività commerciali in vendita/affitto con relativi dati economici.
   - **Colonne**: 28
   - **Relazioni**: `agente_id` -> `agents(id)`

3. **`potential_activities` (Potenziali Acquirenti/Venditori)**
   - **Descrizione**: CRM contatti interessati all'acquisto o alla vendita di attività o immobili.
   - **Colonne**: 39
   - **Relazioni**: `agente_id` -> `agents(id)`

4. **`potential_tobacconists` (Potenziali Tabaccherie)**
   - **Descrizione**: Tabaccherie e ricevitorie identificate per potenziale acquisizione o contatto.
   - **Colonne**: 26
   - **Relazioni**: `agente_id` -> `agents(id)`

5. **`telemarketing_contacts` (Contatti Telemarketing)**
   - **Descrizione**: Liste di contatti da chiamare o qualificati dal reparto telemarketing.
   - **Colonne**: 23
   - **Relazioni**: `agente_id` -> `agents(id)`, `operatore_id` -> `agents(id)`

---

## B, C, D) ANALISI PER TABELLA E MATRICE DEI PRIVILEGI

Di seguito l'analisi dettagliata per ciascuna delle 5 tabelle.

---

### TABELLA: properties
**Descrizione:** Gestione del portafoglio degli immobili disponibili per affitto/vendita.
**Colonne:** 29 | **Record:** Variabile (tabella principale per la gestione del business immobiliare)

#### MATRICE DI PRIVILEGI

| Ruolo | CREATE | READ | UPDATE | DELETE | Note |
|-------|--------|------|--------|--------|------|
| AGENTI | Sì | Solo propri (Frontend) / Tutti (DB) | Solo propri | Solo propri | Frontend filtra per `agente_id` |
| TELEMARKETING | Sì | Tutti (Frontend) | Solo propri | Solo propri | Possono inserire/vedere, ma non modificare quelli altrui |
| ADMIN | Sì | Tutti | Tutti | Tutti | Accesso completo |
| SUPER ADMIN | Sì | Tutti | Tutti | Tutti | Accesso completo |

#### CAMPI VISIBILI PER RUOLO
- **AGENTI**: Tutti i campi, ma solo per i record assegnati a loro (filtro UI).
- **TELEMARKETING**: Tutti i campi (il filtro in UI si applica solo al ruolo 'agente').
- **ADMIN**: Tutti i campi.
- **SUPER ADMIN**: Tutti i campi.

#### CAMPI MODIFICABILI PER RUOLO
- **AGENTI**: Tutti i campi, per record con `agente_id == auth.uid()`.
- **TELEMARKETING**: Tutti i campi, per record con `agente_id == auth.uid()`.
- **ADMIN**: Tutti i campi su tutti i record. Può modificare l'agente assegnato.
- **SUPER ADMIN**: Tutti i campi su tutti i record. Può modificare l'agente assegnato.

#### RLS POLICIES
- `prop_select`: `SELECT USING ((auth.role() = 'authenticated'::text))`
- `prop_insert`: `INSERT USING (true)`
- `prop_update`: `UPDATE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`
- `prop_delete`: `DELETE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`

#### IMPLEMENTAZIONE NEL FRONTEND
- **`App.jsx`**: Rotta `/properties` protetta con `allowedRoles={['admin', 'agente', 'telemarketing', 'super_admin']}`.
- **`DataContext.jsx`**: Se `userRole === 'agente'`, applica `query.eq('agente_id', user.id)`.
- **`RecordDetailModal.jsx`**: `canEditRecord` verifica `['admin', 'super_admin'].includes(userRole) || editedRecord.agente_id === user.id`.

#### CONDIZIONI DI ACCESSO
Il database permette lettura universale agli utenti autenticati. Il limite visivo è imposto lato client. L'update/delete è sicuro grazie alle policies che richiedono l'ownership (`agente_id`) o il ruolo elevato.

---

### TABELLA: commercial_activities
**Descrizione:** Gestione delle attività commerciali (es. bar, ristoranti, negozi).
**Colonne:** 28 | **Record:** Variabile

#### MATRICE DI PRIVILEGI

| Ruolo | CREATE | READ | UPDATE | DELETE | Note |
|-------|--------|------|--------|--------|------|
| AGENTI | Sì | Solo propri (UI) | Solo propri | Solo propri | Uguale a properties |
| TELEMARKETING | Sì | Tutti (UI) | Solo propri | Solo propri | |
| ADMIN | Sì | Tutti | Tutti | Tutti | |
| SUPER ADMIN | Sì | Tutti | Tutti | Tutti | |

#### CAMPI VISIBILI PER RUOLO
- **TUTTI I RUOLI**: Tutti i campi (limitato dal set di righe ritornato in UI).

#### CAMPI MODIFICABILI PER RUOLO
- **AGENTI / TELEMARKETING**: Tutti i campi per i propri record. Impossibile modificare l'agente.
- **ADMIN / SUPER ADMIN**: Tutti i campi, inclusa la riassegnazione (`agente_id`).

#### RLS POLICIES
- `ca_select`: `SELECT USING ((auth.role() = 'authenticated'::text))`
- `ca_insert`: `INSERT USING (true)`
- `ca_update`: `UPDATE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`
- `ca_delete`: `DELETE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`

#### IMPLEMENTAZIONE NEL FRONTEND
Come per `properties`. `ActivitiesPage.jsx` usa il pulsante "Nuova Attività" limitato a `['admin', 'super_admin', 'agente'].includes(userRole)`.

#### CONDIZIONI DI ACCESSO
Visibilità filtrata dal `DataContext.jsx` in base al ruolo. Gli admin hanno accesso a `AdminTableToolbar` per import/export ed eliminazioni massive.

---

### TABELLA: potential_activities
**Descrizione:** Anagrafiche contatti (acquirenti o venditori) per incrocio domanda/offerta.
**Colonne:** 39 | **Record:** Variabile

#### MATRICE DI PRIVILEGI

| Ruolo | CREATE | READ | UPDATE | DELETE | Note |
|-------|--------|------|--------|--------|------|
| AGENTI | Sì | Solo propri (UI) | Solo propri | Solo propri | |
| TELEMARKETING | Sì | Tutti (UI) | Solo propri | Solo propri | |
| ADMIN | Sì | Tutti | Tutti | Tutti | |
| SUPER ADMIN | Sì | Tutti | Tutti | Tutti | |

#### RLS POLICIES
- `pa_select`: `SELECT USING ((auth.role() = 'authenticated'::text))`
- `pa_insert`: `INSERT USING (true)`
- `pa_update`: `UPDATE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`
- `pa_delete`: `DELETE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`

#### IMPLEMENTAZIONE NEL FRONTEND
Accesso via `/potential-activities`. Controlli `RecordDetailModal.jsx` in atto per precludere la visibilità dei tasti Modifica/Elimina ad agenti che non possiedono la risorsa.

---

### TABELLA: potential_tobacconists
**Descrizione:** Tabelle specifiche per le tabaccherie, con campi dedicati (Aggi, distributori).
**Colonne:** 26 | **Record:** Variabile

#### MATRICE DI PRIVILEGI

| Ruolo | CREATE | READ | UPDATE | DELETE | Note |
|-------|--------|------|--------|--------|------|
| AGENTI | Sì | Solo propri (UI) | Solo propri | Solo propri | |
| TELEMARKETING | Sì | Tutti (UI) | Solo propri | Solo propri | |
| ADMIN | Sì | Tutti | Tutti | Tutti | |
| SUPER ADMIN | Sì | Tutti | Tutti | Tutti | |

#### RLS POLICIES
- `pt_select`: `SELECT USING ((auth.role() = 'authenticated'::text))`
- `pt_insert`: `INSERT USING (true)`
- `pt_update`: `UPDATE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`
- `pt_delete`: `DELETE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`

#### IMPLEMENTAZIONE NEL FRONTEND
Uguale al resto del core. `PotentialTobacconistsPage.jsx` monta la `DataTable`.

---

### TABELLA: telemarketing_contacts
**Descrizione:** Focus sulle attività dei centralinisti (presa in carico, richiami, assegnazioni finali).
**Colonne:** 23 | **Record:** Variabile

#### MATRICE DI PRIVILEGI

| Ruolo | CREATE | READ | UPDATE | DELETE | Note |
|-------|--------|------|--------|--------|------|
| AGENTI | Sì (API) | No (UI Bloccata) | No | No | Accesso UI precluso dalla rotta. |
| TELEMARKETING| Sì | Tutti | Tutti | Tutti | Hanno policy equiparate ad Admin per questa tabella. |
| ADMIN | Sì | Tutti | Tutti | Tutti | |
| SUPER ADMIN | Sì | Tutti | Tutti | Tutti | |

#### CAMPI VISIBILI PER RUOLO
- **AGENTI**: Non vedono la tabella tramite UI. (Rotta `/telemarketing` esclusa in `App.jsx`).
- **TELEMARKETING, ADMIN, SUPER ADMIN**: Tutti i campi.

#### CAMPI MODIFICABILI PER RUOLO
- **TELEMARKETING**: Possono assegnare contatti (`agente_id`) e modificare qualsiasi record in questa tabella (`RecordDetailModal.jsx` fa un'eccezione: `record.recordType === 'Telemarketing'` permette sempre l'edit).

#### RLS POLICIES
- `tm_select`: `SELECT USING ((auth.role() = 'authenticated'::text))`
- `tm_insert`: `INSERT USING (true)`
- `tm_update`: `UPDATE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text, 'telemarketing'::text])))))`
- `tm_delete`: `DELETE USING (((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (operatore_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text, 'telemarketing'::text])))))`

#### IMPLEMENTAZIONE NEL FRONTEND
- **`App.jsx`**: Rotta `/telemarketing` permessa solo a `['admin', 'telemarketing', 'super_admin']`.
- **`DataContext.jsx`**: Fetcha la tabella solo se l'utente ha uno dei ruoli sopra citati. NESSUN filtro `agente_id` è applicato al fetching.
- **`RecordDetailModal.jsx`**: Introduce il tasto speciale "Assegna ad Agente" solo per questo record type, abilitando `AssignAgentModal.jsx`.

---

## E) ANALISI DEL MECCANISMO DI CONTROLLO

### 1. Determinazione del Ruolo
Il ruolo viene determinato intersecando l'autenticazione JWT di Supabase (Auth) con la tabella pubblica `agents`.
- In **Backend (DB)**: La funzione RPC `get_my_role()` esegue `SELECT role FROM agents WHERE id = auth.uid()`.
- In **Frontend (React)**: `SupabaseAuthContext.jsx` intercetta il cambio di sessione, estrae `session.user.id`, interroga la tabella `agents` ed espone lo stato `userRole` (stringa: `'agente'`, `'telemarketing'`, `'admin'`, `'super_admin'`).

### 2. Verifica del Ruolo
La verifica avviene a molteplici livelli (Defense in Depth frammentata):
1. **Routing (`App.jsx`)**: Il componente `<ProtectedRoute>` espelle chi non corrisponde agli `allowedRoles` ritornando a `/dashboard`.
2. **UI Rendering**: Componenti come `<AdminTableToolbar>` o la visualizzazione di tab/bottoni usano `if (['admin', 'super_admin'].includes(userRole))` per decidere se renderizzare.
3. **Data Fetching (`DataContext.jsx`)**: Inietta programmaticamente filtri lato client (`query.eq('agente_id', user.id)`) per impedire che i dati arrivino allo stato React.
4. **Mutazioni Database (RLS)**: Le policies fermano gli updates/deletes a livello di DB valutando `get_my_role()`.

### 3. Funzioni di Controllo Specifiche
- **Backend**: `get_my_role()` in PL/PGSQL.
- **Frontend**: 
  - `useAuth().userRole`
  - `<ProtectedRoute allowedRoles={[...]}>`
  - `getRolePermission(tableName, role)` all'interno di `src/utils/searchConfig.js`.

### 4. Gestione dell'Accesso Negato
- **Routing Level**: Redirect forzato a `/dashboard` se i permessi non sussistono. Nessun messaggio mostrato.
- **Component Level (es. Modali)**: Condizioni come `if (!canEditRecord)` bloccano il salvataggio o fanno fallire il submit mostrando un `toast` ("Permesso negato").
- **Database Level**: Richieste dirette illegali o malformate ritornano `error: permission denied by row-level security` e un array vuoto o nullo.

---

## F) INCONSISTENZE E GAP DI SICUREZZA RILEVATI (CRITICITÀ)

L'architettura presenta buone intenzioni per la segregazione dei privilegi, ma l'implementazione pratica rivela **lacune di sicurezza (Security Gaps) rilevanti**:

### 1. READ Leak: Bypass globale del Data Fetching (Alta Criticità)
Tutte le 5 tabelle principali presentano la policy di SELECT seguente:
`SELECT USING ((auth.role() = 'authenticated'::text))`
- **Disfunzione**: Questo significa che a livello di Database *qualsiasi utente loggato* può leggere l'intero CRM.
- **Rischio**: Il blocco che impedisce a un Agente di vedere i clienti degli altri è unicamente in `DataContext.jsx` (Frontend). Basterebbe aprire la DevTools Console ed eseguire una fetch diretta con il client Supabase iniettato per scaricare tutta la pipeline di concorrenti o agenzie interne.
- **Raccomandazione**: Le policy `SELECT` in Supabase DEVONO replicare la logica: 
  `agente_id = auth.uid() OR get_my_role() = ANY('{admin,super_admin,telemarketing}')`

### 2. INSERT Privileges "Open to All" (Media Criticità)
Tutte le tabelle hanno la policy `INSERT USING (true)`.
- **Disfunzione**: Qualsiasi utente autenticato può fare script per inserire dati massivamente ovunque, aggirando il frontend.
- **Raccomandazione**: Restringere `INSERT` permettendolo solo se `agente_id = auth.uid() OR role IN ('admin',...)`.

### 3. Ruolo Telemarketing vs Resto del CRM
Nel file `DataContext.jsx`, il filtro `query.eq('agente_id', user.id)` viene applicato **SOLO se** `userRole === 'agente'`.
- **Disfunzione**: Poiché `userRole` in `DataContext.jsx` non viene esplicitamente filtrato per i Telemarketing per le tabelle diverse da `telemarketing_contacts`, un utente `telemarketing` sta potenzialmente scaricando sulla propria macchina locale **l'intero database** di immobili e attività commerciali di tutti gli agenti (comportandosi di fatto come un Admin in lettura su tali entità).

### 4. Gestione Documenti (Storage & DB)
La policy della tabella `documents`:
`CREATE POLICY "Enable all access for authenticated users" ON documents FOR ALL USING ((auth.role() = 'authenticated'::text))`
- E del bucket `objects` in storage:
`"Authenticated users can view documents" ON objects FOR SELECT USING ((bucket_id = 'documents'::text))`
- **Rischio**: Assenza totale di RLS basato sul ruolo o sull'appartenenza del record parent. Ogni Agente può leggere e cancellare gli allegati o i contratti PDF di un altro Agente (se conosce o indovina l'URL o l'UUID).

### 5. Configurazione Ruoli Search / API
Nel modulo di ricerca global (`global-search` edge function o nel client via `useClientSearch`), il backend potrebbe star ritornando entità nascoste a determinati ruoli qualora la Edge Function usi il `service_role_key` ignorando le regole RLS di chi la invoca.

### RACCOMANDAZIONI PER MIGLIORAMENTI
1. **Hardening RLS (Urgentissimo)**: Risolvere i permessi di lettura in Supabase. Mappare esplicitamente l'RLS di `SELECT` associando a ogni `user.id` e al risultato di `get_my_role()` la competenza gerarchica.
2. **Sicurezza Storage**: Integrare in Storage il controllo della tabella parent (via Edge Function o Custom JWT Claims) per impedire il download trasversale di PDF/Documenti.
3. **Messa in sicurezza Telemarketing**: Chiarire nel codice se un operatore Call Center debba vedere il parco clienti degli Agenti in fase di consultazione. Qualora non debba, adeguare il `DataContext.jsx` ed imporre il blocco via RLS.
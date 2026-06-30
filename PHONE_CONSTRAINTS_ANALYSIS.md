# Analisi Constraint e Indici: Campi Telefono

Basandosi sull'analisi approfondita dello schema del database Supabase fornito, ecco il report dettagliato sui vincoli (constraints), indici, check e policy RLS applicati ai campi relativi ai numeri di telefono (es. `telefono`, `telefono_proprietario`) per le tabelle richieste.

---

### TABELLA: telemarketing_contacts (Telemarketing)

Campo telefono analizzato: **`telefono`**
- **Ha constraint UNIQUE:** NO. Il database non impone l'unicità a livello di colonna o tabella.
- **Ha indice:** NO. Non risultano indici B-Tree o Hash personalizzati configurati esplicitamente sul campo per l'ottimizzazione delle ricerche (es. per query di deduplicazione).
- **Ha check constraint:** NO. Non ci sono limitazioni sulla lunghezza minima/massima, caratteri ammessi (es. solo numeri o prefissi). Accetta qualsiasi stringa di testo.
- **Ha policy RLS che controlla duplicazione:** NO. Le policy (`tm_delete`, `tm_insert`, `tm_update`, `tm_select`) regolano solo i permessi di accesso basati sul ruolo (admin, agente) o sulla proprietà (`agente_id`, `operatore_id`), ma non bloccano gli inserimenti duplicati.
- **Altre limitazioni:** Nessuna a livello strutturale.
- **Osservazioni:** Il campo è di tipo `text` e permette valori `NULL`. La prevenzione dei duplicati è attualmente delegata interamente all'applicazione client (React/Javascript) o a RPC custom (`delete_duplicate_records`), ma nulla vieta l'inserimento di un duplicato tramite query SQL diretta o API REST.

---

### TABELLA: properties (Immobili)

Campo telefono analizzato: **`telefono_proprietario`**
- **Ha constraint UNIQUE:** NO.
- **Ha indice:** NO.
- **Ha check constraint:** NO.
- **Ha policy RLS che controlla duplicazione:** NO. Le RLS servono solo per controllo accessi e multi-tenancy.
- **Altre limitazioni:** Nessuna.
- **Osservazioni:** Anche in questo caso, è un semplice campo di testo `text` che permette valori `NULL`. Più immobili possono avere lo stesso proprietario (e quindi stesso telefono).

---

### TABELLA: commercial_activities (Attività Commerciali)

Campo telefono analizzato: **`telefono_proprietario`**
- **Ha constraint UNIQUE:** NO.
- **Ha indice:** NO.
- **Ha check constraint:** NO.
- **Ha policy RLS che controlla duplicazione:** NO.
- **Altre limitazioni:** Nessuna.
- **Osservazioni:** Come per gli immobili, non sono stati inseriti vincoli nativi. È frequente che lo stesso numero di telefono appaia per più attività commerciali facenti capo allo stesso proprietario, quindi l'assenza di un vincolo `UNIQUE` qui è appropriata.

---

### TABELLA: potential_tobacconists (Potenziali Tabaccherie)

Campo telefono analizzato: **`telefono`**
- **Ha constraint UNIQUE:** NO.
- **Ha indice:** NO.
- **Ha check constraint:** NO.
- **Ha policy RLS che controlla duplicazione:** NO.
- **Altre limitazioni:** Nessuna.
- **Osservazioni:** La duplicazione dei telefoni non è inibita nativamente nel database.

---

### TABELLA: agents (Agenti)

Campo telefono analizzato: **N/A**
- **Ha constraint UNIQUE:** N/A
- **Ha indice:** N/A
- **Ha check constraint:** N/A
- **Ha policy RLS che controlla duplicazione:** N/A
- **Altre limitazioni:** N/A
- **Osservazioni:** Analizzando lo schema per la tabella `agents`, **non esiste alcun campo relativo al numero di telefono** (es. `phone`, `telefono`). La tabella contiene esclusivamente le colonne: `id`, `name`, `email`, `role`, `color`, `is_master_record`.

---

### CONCLUSIONI GENERALI

1. **Assenza di vincoli rigidi:** Nessuna delle tabelle analizzate utilizza `UNIQUE constraints` o `CHECK constraints` a livello di database per i numeri di telefono.
2. **Architettura "Soft":** Attualmente il sistema CRM fa affidamento su meccanismi "soft" (gestiti tramite logica in React, servizi di deduplicazione in background e check lato server applicativo come RPC in PL/pgSQL) piuttosto che su barriere hard (Constraints DB).
3. **Miglioramento Indici:** Per migliorare nettamente le performance delle routine di deduplicazione e controllo (soprattutto nella tabella `telemarketing_contacts` che tendenzialmente cresce notevolmente), sarebbe fortemente consigliabile l'aggiunta manuale di indici `BTREE` non-unique sui campi `telefono`, ad esempio:
   `CREATE INDEX idx_telemarketing_telefono ON telemarketing_contacts(telefono);`
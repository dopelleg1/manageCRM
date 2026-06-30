# Analisi Schema Database: Campi Telefono (Phone Fields)

Questa è l'analisi dettagliata dei campi relativi ai numeri di telefono nelle tabelle specificate del database Supabase, basata sullo schema attuale.

---

### TABELLA: telemarketing_contacts (Contacts / Telemarketing)

Campo telefono principale:
- Nome: `telefono`
- Tipo: `text`
- È Primary Key: **NO** (La PK è `id` di tipo uuid)
- È Unique: **NO** (La deduplicazione è gestita a livello applicativo tramite script/RPC)
- Nullable: **SI** (Consente valori NULL)
- Note: Rappresenta il recapito telefonico principale del lead telemarketing o dell'azienda. Non sono presenti campi telefonici secondari.

---

### TABELLA: properties (Properties)

Campo telefono principale:
- Nome: `telefono_proprietario`
- Tipo: `text`
- È Primary Key: **NO** (La PK è `id` di tipo uuid)
- È Unique: **NO** 
- Nullable: **SI** 
- Note: Il campo è specificamente nominato `telefono_proprietario` per indicare il recapito del proprietario dell'immobile. 

---

### TABELLA: commercial_activities (Contracts / Attività Commerciali)

Campo telefono principale:
- Nome: `telefono_proprietario`
- Tipo: `text`
- È Primary Key: **NO** (La PK è `id` di tipo uuid)
- È Unique: **NO**
- Nullable: **SI**
- Note: Similmente alla tabella `properties`, il campo è denotato come `telefono_proprietario` per indicare il titolare dell'attività/contratto.

---

### TABELLA: potential_tobacconists (Potenziali Tabaccherie)

Campo telefono principale:
- Nome: `telefono`
- Tipo: `text`
- È Primary Key: **NO** (La PK è `id` di tipo uuid)
- È Unique: **NO**
- Nullable: **SI**
- Note: Campo generico per il telefono del potenziale cliente. 

---

### TABELLA: potential_activities (Potenziali Acquirenti/Venditori)
*(Aggiunta per completezza in quanto entità principale)*

Campo telefono principale:
- Nome: `telefono`
- Tipo: `text`
- È Primary Key: **NO** (La PK è `id` di tipo uuid)
- È Unique: **NO**
- Nullable: **SI**
- Note: Usato per memorizzare il recapito del potenziale acquirente o venditore.

---

## Riepilogo Generale e Osservazioni

1. **Primary Keys:** In NESSUNA tabella il campo telefono è utilizzato come Primary Key. Tutte le tabelle utilizzano una colonna `id` di tipo `uuid` (generato automaticamente) come chiave primaria.
2. **Vincoli di Unicità (Unique Constraints):** NESSUNA tabella possiede un vincolo `UNIQUE` nativo a livello di database sulle colonne dei telefoni. Questo significa che il database permetterebbe fisicamente l'inserimento di duplicati. La prevenzione e gestione dei duplicati è interamente delegata alla logica applicativa (servizi di importazione, deduplicazione e RPC personalizzate come `delete_duplicate_records`).
3. **Data Type Consistency:** C'è coerenza totale nel tipo di dato. Tutti i campi telefonici sono definiti come `text`. Non vengono usati tipi numerici (integer/bigint), il che è una best practice per i numeri di telefono (per preservare zeri iniziali e formattazione internazionale).
4. **Nullability:** Tutti i campi telefonici sono **Nullable** (consentono valori vuoti/NULL). Nessun campo telefono ha il vincolo `NOT NULL`.
5. **Naming Convention:** 
   - Le tabelle orientate alla "persona" o al "lead" (`telemarketing_contacts`, `potential_tobacconists`, `potential_activities`) utilizzano il nome generico **`telefono`**.
   - Le tabelle orientate all'"oggetto" o al "contratto" (`properties`, `commercial_activities`) utilizzano il nome specifico **`telefono_proprietario`**.
6. **Campi Multipli:** Nessuna delle tabelle analizzate possiede attualmente campi telefonici multipli (es. `telefono_2`, `cellulare`, `telefono_ufficio`). Esiste un solo punto di contatto telefonico designato per record.
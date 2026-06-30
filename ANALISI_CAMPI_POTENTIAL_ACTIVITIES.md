# ANALISI COMPLETA: Campi modificabili dagli agenti su `potential_activities`

Questo documento fornisce un'analisi dettagliata della tabella `potential_activities` (Potenziali Acquirenti/Venditori), esaminando i permessi di modifica per gli agenti, le logiche di frontend e le restrizioni del database.

---

## 1. SCHEMA COMPLETO DELLA TABELLA (`potential_activities`)

| Campo | Tipo Dato | Obbligatorio (DB) | Default | Descrizione / Uso |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `uuid` | **Sì** | `gen_random_uuid()` | Identificativo univoco |
| `type` | `text` | **Sì** | - | Tipo di contatto ('acquirente' o 'venditore') |
| `nome` | `text` | No | - | Nome del contatto |
| `cognome` | `text` | No | - | Cognome del contatto |
| `telefono` | `text` | No | - | Telefono principale |
| `email` | `text` | No | - | Email del contatto |
| `indirizzo` | `text` | No | - | Indirizzo (autocomplete) |
| `lat` | `numeric` | No | - | Latitudine |
| `lng` | `numeric` | No | - | Longitudine |
| `citta` | `text` | No | - | Città |
| `zona` | `text` | No | - | Zona (Quartiere) |
| `regione` | `text` | No | - | Regione |
| `agente_id` | `uuid` | No | - | FK su `agents`. Definisce l'owner del record |
| `note` | `text` | No | - | Note libere |
| `data_richiamo` | `date` | No | - | Data pianificata per il richiamo |
| `created_at` | `timestamptz`| **Sì** | `now()` | Data di creazione |
| `budget` | `numeric` | No | - | Budget (usato tipicamente per acquirenti) |
| `locali` | `integer` | No | - | Numero locali (legacy/inutilizzato nel modale attuale) |
| `mq` | `integer` | No | - | Metri quadri (legacy/inutilizzato nel modale attuale) |
| `bagni` | `integer` | No | - | Numero bagni (legacy/inutilizzato) |
| `aggi` | `text` | No | - | Aggi (legacy/inutilizzato) |
| `ricavo` | `numeric` | No | - | Ricavo (usato nella tabella visuale per venditori, ma *non* editabile nel modale) |
| `categoria` | `text` | No | - | Categoria configurabile (es. Bar, Ristorante) |
| `caratteristiche` | `text` | No | - | Caratteristiche (legacy/inutilizzato) |
| `stato_presa_in_carico`| `text` | No | - | Legacy/Inutilizzato |
| `numero` | `integer` | No | - | Identificativo progressivo (generato/gestito esternamente) |
| `stato` | `text` | No | - | Stato del contatto (Configurabile) |
| `anagrafica_type` | `text` | No | - | Tipo anagrafica (legacy/inutilizzato in questa view) |
| `locali_min` | `integer` | No | - | Legacy/Filtri avanzati |
| `locali_max` | `integer` | No | - | Legacy/Filtri avanzati |
| `mq_min` | `integer` | No | - | Legacy/Filtri avanzati |
| `mq_max` | `integer` | No | - | Legacy/Filtri avanzati |
| `bagni_status` | `text` | No | - | Legacy/Filtri avanzati |
| `arredo` | `text` | No | - | Legacy/Filtri avanzati |
| `stato_prima_visita` | `text` | No | - | Legacy/Filtri avanzati |
| `stato_prima_visita_data`| `date` | No | - | Legacy/Filtri avanzati |
| `is_master_record` | `boolean` | No | - | Flag per gestione duplicati |
| `allegati_urls` | `jsonb` | No | - | Array di URL allegati |
| `phone_2` | `text` | No | - | Telefono secondario |

---

## 2. MATRICE DI PERMESSI PER CAMPO (Frontend Modal)

Di seguito la matrice per i campi **visibili nel modale** per gli Agenti.
*(Nota: a livello di Database RLS, l'agente assegnato può modificare tecnicamente tutta l'intera riga, ma il frontend limita i campi)*
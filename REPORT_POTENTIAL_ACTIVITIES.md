# Analisi Struttura Tabella: `potential_activities`

## 1. Verifica Campi Timestamp/Data
Dall'analisi dello schema del database, è confermata la presenza di un campo automatico per la data di creazione del record.

**Nota Importante:** Non è presente un campo standard `updated_at` (data di modifica) in questa tabella specifica, a differenza di altre tabelle del sistema.

## 2. Identificazione Esatta
- **Nome Tabella:** `potential_activities`
- **Campo Data Creazione:** `created_at`

## 3. Formato del Campo
- **Tipo di dato:** `timestamp with time zone` (PostgreSQL)
- **Formato standard:** ISO 8601 (es. `2024-01-12T14:30:00.123Z`)
- Include data, ora e fuso orario (UTC).

## 4. Altri Campi Data Rilevati
Oltre alla data di creazione, la tabella contiene:

- **`data_richiamo`**
  - **Tipo:** `date`
  - **Descrizione:** Utilizzato per gestire i richiami o follow-up.
  - **Formato:** YYYY-MM-DD (es. `2024-01-15`). Non include l'orario.

## 5. Script di Verifica

Puoi utilizzare questo script JavaScript (compatibile con il client Supabase già configurato nel progetto) per verificare i dati direttamente dalla console del browser o importandolo nel progetto.

### Script JavaScript (da eseguire nella console del browser o in un file di utility)
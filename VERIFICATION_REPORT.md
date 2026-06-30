# Verification Report: Supabase Database Schema Analysis

This document provides a comprehensive analysis of the Supabase database schema to support the creation of a robust, generic import system.

## 1. Table Analysis

### `telemarketing_contacts`
*   **Purpose**: Stores raw contacts for telemarketing campaigns.
*   **Primary Key**: `id` (uuid)
*   **Foreign Keys**: 
    *   `agente_id` -> `agents(id)`
    *   `operatore_id` -> `agents(id)`
*   **Fields**:
    *   `nome` (text, optional)
    *   `cognome` (text, optional - *Recommended for identification*)
    *   `nome_azienda` (text, optional)
    *   `telefono` (text, optional)
    *   `email` (text, optional)
    *   `indirizzo` (text, optional)
    *   `citta` (text, optional)
    *   `regione` (text, optional)
    *   `categoria` (text, optional)
    *   `tipologia` (text, optional)
    *   `note` (text, optional)
    *   `data_ultimo_richiamo` (date, optional)
    *   `stato` (text, optional)
    *   `anagrafica_type` (text, optional - e.g., 'AZIENDA', 'PERSONA')

### `potential_tobacconists`
*   **Purpose**: Leads specific to tobacconists (Tabaccherie).
*   **Primary Key**: `id` (uuid)
*   **Foreign Keys**: `agente_id` -> `agents(id)`
*   **Fields**:
    *   `numero_rivendita` (integer, optional - *Key business identifier*)
    *   `nome` (text, optional)
    *   `cognome` (text, optional)
    *   `citta` (text, optional)
    *   `indirizzo` (text, optional)
    *   `tipo_rivendita` (text, optional)
    *   `distributore` (text, optional)
    *   `data_ultimo_richiamo` (date, optional)

### `potential_activities`
*   **Purpose**: Potential buyers (Acquirenti) or sellers (Venditori).
*   **Primary Key**: `id` (uuid)
*   **Foreign Keys**: `agente_id` -> `agents(id)`
*   **Fields**:
    *   `type` (text, **MANDATORY**: 'acquirente' | 'venditore')
    *   `nome` (text, optional)
    *   `cognome` (text, optional)
    *   `budget` (numeric, optional - Buyer specific)
    *   `ricavo` (numeric, optional - Seller specific)
    *   `locali` (integer, optional)
    *   `mq` (integer, optional)
    *   `data_richiamo` (date, optional)

### `properties`
*   **Purpose**: Real estate properties managed by the agency.
*   **Primary Key**: `id` (uuid)
*   **Foreign Keys**: `agente_id` -> `agents(id)`
*   **Fields**:
    *   `codice` (text, **MANDATORY**)
    *   `prezzo` (numeric, optional)
    *   `mq` (integer, optional)
    *   `caratteristiche` (text[], array of strings - *Requires special parsing*)
    *   `scadenza_mandato` (date, optional)
    *   `data_richiamo` (date, optional)

### `commercial_activities`
*   **Purpose**: Commercial businesses for sale/rent.
*   **Primary Key**: `id` (uuid)
*   **Foreign Keys**: `agente_id` -> `agents(id)`
*   **Fields**:
    *   `codice` (text, optional - *Recommended*)
    *   `aggi` (numeric, optional)
    *   `ricavo` (numeric, optional)
    *   `prezzo` (numeric, optional)
    *   `scadenza_mandato` (date, optional)

### `appointments`
*   **Purpose**: Calendar events.
*   **Primary Key**: `id` (uuid)
*   **Foreign Keys**: `agente_id` -> `agents(id)`
*   **Fields**:
    *   `title` (text, **MANDATORY**)
    *   `start_time` (timestamptz, **MANDATORY**)
    *   `end_time` (timestamptz, **MANDATORY**)

## 2. Data Type Conversions Required

1.  **Dates (`date`, `timestamptz`)**:
    *   Input formats vary (DD/MM/YYYY, YYYY-MM-DD, ISO).
    *   Must convert to ISO 8601 (YYYY-MM-DD for dates, ISO string for timestamps).
2.  **Numbers (`numeric`, `integer`)**:
    *   Input often contains thousands separators (.) or decimal commas (,).
    *   Must sanitize (remove non-numeric chars except valid decimal separator) and parse.
3.  **Arrays (`text[]`)**:
    *   Input is usually a comma-separated string (e.g., "Garden, Garage, Pool").
    *   Must split into array.
4.  **Booleans**:
    *   Input: "Si", "No", "Yes", "1", "0".
    *   Must normalize to `true`/`false`.

## 3. Integrity Constraints

*   **Foreign Keys**: `agente_id` and `operatore_id` must match an existing UUID in the `agents` table. If the import CSV provides a name (e.g., "Mario Rossi"), the system must lookup the ID. If not found, it should either fail, warn, or create a placeholder (depending on strictness). The current implementation attempts to lookup or defaults to current user.
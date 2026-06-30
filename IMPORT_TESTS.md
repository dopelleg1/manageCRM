# Import System Test Plan

This document outlines the test cases for verifying the generic import system.

## 1. General Validation
*   **Empty CSV**: Uploading an empty file should trigger an error.
*   **Invalid Extension**: Uploading .txt or .xlsx should trigger a validation error.
*   **Header Mismatch**: If headers don't match exactly, the mapping step should allow manual correction.

## 2. Table-Specific Tests

### Telemarketing Contacts
*   **Test Case**: `nome`, `cognome`, `telefono` columns present.
*   **Expected**: Data imported, `agente_id` set to current user if missing.
*   **Edge Case**: "Data Richiamo" in format "25/12/2023". Should parse correctly to "2023-12-25".

### Potential Tobacconists
*   **Test Case**: `numero_rivendita` is "123".
*   **Expected**: Saved as integer 123.
*   **Edge Case**: `numero_rivendita` is "123/A" (alphanumeric). Should fail validation or strip suffix depending on strictness (Validation should probably fail for pure integer fields).

### Potential Activities
*   **Test Case**: `type` column missing.
*   **Expected**: Import should fail or prompt for default value, as `type` is required for logic.
*   **Test Case**: `budget` is "100.000,00".
*   **Expected**: Parsed as numeric 100000.00.

### Properties
*   **Test Case**: `caratteristiche` contains "Vista mare, Garage, Ascensore".
*   **Expected**: Saved as `['Vista mare', 'Garage', 'Ascensore']` in Supabase `text[]` column.

## 3. Batching & Performance
*   **Large Dataset**: Import a CSV with 500 rows.
*   **Expected**: Progress bar updates smoothly. Data inserted in chunks (e.g., 50 or 100 rows). No timeout errors.

## 4. Error Handling
*   **Constraint Violation**: Try to import a duplicate unique key (if unique constraints exist on specific cols like `codice`).
*   **Expected**: Row marked as error in summary, other rows proceed.
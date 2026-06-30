# Import Architecture Analysis & Telemarketing Issue Diagnosis

This document provides a comprehensive analysis of the import architecture, the specific flow for telemarketing contacts, and a diagnosis of the mapping issues currently experienced (e.g., address data appearing in the surname field).

## 1. Import Architecture Overview

The application utilizes a **Client-Side Centralized Import Strategy** with logic housed primarily in `ImportModal.jsx`, supported by shared utilities.

### Centralization vs. Distribution
*   **Central Processing Hub**: `src/components/import/ImportModal.jsx`
    *   This component contains the "Brain" of the operation: the `TARGET_FIELDS` constant which defines the schema for *every* table in the system (`commercial_activities`, `properties`, `telemarketing_contacts`, etc.).
    *   It handles the UI wizard steps (Upload -> Map -> Confirm -> Result).
    *   It executes the CSV parsing (PapaParse) and Supabase insertions.
*   **Distributed Triggers**: Each page (e.g., `TelemarketingPage.jsx`) simply invokes `<ImportModal />` and passes a `tableName` prop. There is no unique import logic on the pages themselves, ensuring consistency.
*   **Shared Intelligence**: `src/utils/columnNormalization.js` provides the logic for "Smart Matching" columns, removing the need for manual mapping every time.

### Visual Architecture Flow
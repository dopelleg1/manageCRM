# Report Analisi Importazioni

## 1. Centralizzazione
La logica è centralizzata in `src/components/import/ImportModal.jsx`.

## 2. Tabelle e Logica
- **commercial_activities**: Gestita in `ImportModal.jsx` (chiamata da `ActivitiesPage.jsx`)
- **properties**: Gestita in `ImportModal.jsx` (chiamata da `PropertiesPage.jsx`)
- **potential_tobacconists**: Gestita in `ImportModal.jsx` (chiamata da `PotentialTobacconistsPage.jsx`)
- **potential_activities**: Gestita in `ImportModal.jsx` (chiamata da `PotentialActivitiesPage.jsx`)
- **telemarketing_contacts**: Gestita in `ImportModal.jsx` (chiamata da `TelemarketingPage.jsx`)

## 3. Schema Temporale
Tutte le tabelle utilizzano il campo `created_at` di tipo `timestamp with time zone`.
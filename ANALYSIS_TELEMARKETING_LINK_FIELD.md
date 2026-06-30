# ANALYSIS REPORT: Telemarketing "Link" (Drive Link) Field

## Executive Summary
An in-depth code and database analysis was conducted to investigate reports of a disabled "link" field within the Telemarketing module. The field in question maps to the `allegati_urls` column in the database and is used to store external URLs (such as Google Drive or Dropbox links). 

The investigation reveals that there is no specific hardcoded `disabled={true}` bug for this field. Instead, the field is governed by the global `isEditing` state of the modal, meaning it is intentionally hidden/read-only until the user actively clicks the **"Modifica"** (Edit) button. Furthermore, the "Aggiungi" (Add) button is disabled when the input is empty to prevent invalid data entries.

---

## 1. LOCATE THE FIELD

**Database Schema:**
In the `telemarketing_contacts` table, the links are stored in the `allegati_urls` column, which is of type `jsonb`.

**Codebase Locations:**
- **Detail Modal:** `src/components/calendar/RecordDetailModal.jsx`
- **Render Function:** `renderLinksSection()` (Lines ~420-475)
- **State Management:** Uses `newUrl` local state and modifies the `editedRecord.allegati_urls` array via `handleAddUrl` and `handleRemoveUrl`.
- **UI Placement:** The field is located inside the `<TabsContent value="links">` panel of the `RecordDetailModal`.

---

## 2. DETERMINE THE REASON

The perception that the field is "disabled" stems from two distinct UI/UX conditions:

1. **View Mode vs. Edit Mode (`isEditing`):**
   When an existing Telemarketing record is opened from the `TelemarketingPage.jsx`, it is passed to the modal with `startInEditMode={!selectedRecord.id}`. Since existing records have an ID, `startInEditMode` is `false`. 
   
   In `RecordDetailModal.jsx`, the link input field is wrapped in an `isEditing` check:
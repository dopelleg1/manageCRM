# Analysis Report: Form Data Persistence Implementation

## 1. Executive Summary
The analysis of the "Aggiungi Nuovo" functionality in `PotentialActivitiesPage.jsx` and related components reveals a **critical implementation mismatch** between the storage mechanisms used for reading and writing drafts. While the page attempts to retrieve drafts from `sessionStorage`, the dedicated draft service (`draftAutoSaveService.js`) is configured to use `localStorage`. Additionally, the secondary modal `CreatePotentialModal.jsx` currently lacks any persistence logic.

## 2. Component Analysis

### A. PotentialActivitiesPage.jsx (Modal Trigger)
- **Mechanism**: Implements draft detection on mount using `useSessionStorage` hook.
- **Current Behavior**:
  - Initializes `useSessionStorage`.
  - On page load, calls `getFormData('potential_activities', 'new')`.
  - If a draft is found in **SessionStorage**, displays a Toast with a "Riprendi" (Resume) button.
- **Issue**: It exclusively listens to `sessionStorage`. If the form component writes to `localStorage`, this detection will fail.

### B. CreatePotentialModal.jsx (Form Component)
- **Mechanism**: Uses standard React `useState` for all form fields (`nome`, `cognome`, `telefono`, etc.).
- **Persistence**: **None (Option 3: React state only)**.
- **Behavior**:
  - **On Cancel/Close**: The `useEffect` hook resets all state variables when `contact` or `isOpen` prop changes. Data is strictly tied to the component's lifecycle.
  - **On Refresh/Navigation**: All data is immediately lost as it resides in volatile memory (RAM).
  - **Gap**: There is no integration with `useDraftAutoSave` or `useSessionStorage`.

### C. Storage Services & Hooks
#### 1. src/hooks/useDraftAutoSave.js & src/utils/draftAutoSaveService.js
- **Storage Target**: **LocalStorage**.
- **Implementation**: 
  - `saveDraft` writes to `localStorage`.
  - `getDraft` reads from `localStorage`.
- **Purpose**: Designed for long-term persistence (survives browser close).

#### 2. src/hooks/useSessionStorage.js (Referenced in Page)
- **Storage Target**: **SessionStorage**.
- **Implementation**:
  - Writes/Reads specifically from `sessionStorage`.
- **Purpose**: Designed for session-based persistence (cleared when tab/window is closed).

## 3. Data Flow & Issues

### The Mismatch Problem
There is a functional disconnection in the persistence architecture:
1. **The Writer (Assumed)**: If `RecordDetailModal` (used by "Aggiungi Nuovo") uses `useDraftAutoSave`, it writes to `localStorage`.
2. **The Reader**: `PotentialActivitiesPage.jsx` checks `sessionStorage`.

**Result**: A user might start a form, the system might save it to `localStorage`, but when they return, the page checks `sessionStorage`, finds nothing, and does not offer to resume the draft.

### Persistence Scenarios

| Scenario | CreatePotentialModal | Main "Aggiungi Nuovo" (Inferred) |
| :--- | :--- | :--- |
| **User types then clicks Cancel** | Data Lost (Reset on close) | Data Persisted (if hook connected), but reference lost on reopen if ID resets |
| **User closes Modal** | Data Lost | Same as above |
| **User refreshes Page** | Data Lost | **Broken**: Data might exist in LocalStorage, but Page checks SessionStorage |
| **User opens new Tab** | Data Lost | **Broken**: SessionStorage is tab-specific; LocalStorage is shared. Mismatch prevents recovery. |

## 4. Recommendations

1. **Unify Storage Strategy**: 
   - Choose either `localStorage` (better for crash recovery) or `sessionStorage` (better for privacy/shared computers) and apply it consistently across the Page and the Modal.
   - **Recommended**: Migrate `PotentialActivitiesPage` to use `draftAutoSaveService` (LocalStorage) to match the existing service implementation.

2. **Implement Persistence in CreatePotentialModal**:
   - Integrate `useDraftAutoSave` hook into `CreatePotentialModal.jsx`.
   - Use `saveCurrentDraft` on form updates (debounced).
   - Use `removeDraft` on successful submission.

3. **Fix Detection Logic**:
   - Update `PotentialActivitiesPage.jsx` to check the same storage source that the forms write to.
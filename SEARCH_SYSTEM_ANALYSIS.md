# CRM Search System Analysis

## 1. Search Functionality Overview

The CRM uses a mix of client-side filtering via `DataTable` (TanStack Table) and custom filtering logic in specific pages.

### Implementation Methods
*   **DataTable Built-in Search:** Most pages use the `DataTable` component which implements a global client-side filter.
    *   *Component:* `src/components/ui/data-table.jsx`
    *   *Mechanism:* Uses `useReactTable`'s `globalFilter` state.
    *   *Trigger:* Real-time typing in an `Input` field.
*   **Custom Page-Level Search:** `PotentialActivitiesPage` implements its own search logic before passing data to `DataTable`.
    *   *Component:* `src/pages/PotentialActivitiesPage.jsx`
    *   *Mechanism:* Filters the `potentialActivities` array based on `searchTerm` state.

### Search Implementation by Page

| Page | Component | Search Method | Searchable Fields (Client-Side) |
| :--- | :--- | :--- | :--- |
| **Activities / Commercial** | `ActivitiesPage.jsx`<br>`CommercialActivitiesPage.jsx` | `DataTable` Global Filter | All rendered columns: `full_code` (Codice+Numero), `categoria`, `citta`, `indirizzo`, `agent_name`, `stato` |
| **Properties** | `PropertiesPage.jsx` | `DataTable` Global Filter | All rendered columns: `codice_id` (Codice+Numero), `citta`, `prezzo`, `stato` |
| **Potential Tobacconists** | `PotentialTobacconistsPage.jsx` | `DataTable` Global Filter | All rendered columns: `numero_rivendita`, `nome`, `cognome`, `citta`, `zona` |
| **Potential Activities** | `PotentialActivitiesPage.jsx` | **Custom Filter** | Explicitly filters by: `nome`, `cognome`, `note`, `email`, `numero` (ID) |
| **Telemarketing** | `TelemarketingPage.jsx` | `DataTable` Global Filter | All rendered columns: `anagrafica_type`, `nome_azienda`, `nome`, `cognome`, `telefono`, `email` |
| **Agents** | `AgentsPage.jsx` | `DataTable` Global Filter | All rendered columns: `name`, `email`, `role` |

---

## 2. Role-Based Data Access & Filtering

Data access is controlled at two levels:
1.  **Database Level (RLS):** Supabase Row Level Security policies.
2.  **Application Level (DataContext):** `fetchData` logic in `src/contexts/DataContext.jsx`.

### 2.1 AGENTE Role
*   **Access Principle:** Generally restricted to records they own (`agente_id = auth.uid()`).
*   **DataContext Filtering:**
    *   `properties`: Filtered by `agente_id`
    *   `commercial_activities`: Filtered by `agente_id`
    *   `potential_tobacconists`: Filtered by `agente_id`
    *   `potential_activities`: Filtered by `agente_id`
    *   `appointments`: Filtered by `agente_id`
    *   `telemarketing_contacts`: **NO FILTER** in `DataContext` (Agente sees all contacts assigned to them? Logic suggests Agente *can* see telemarketing data if they have role 'telemarketing', but code says Agente role gets these filtered by ID too? *Correction:* `telemarketing_contacts` is **NOT** fetched for role 'agente' in `fetchAllData`. It is only fetched if role is `admin`, `telemarketing`, or `super_admin`. However, if they did fetch it, the `fetchData` function applies `agente_id` filter).
*   **Search Scope:** Client-side search operates ONLY on the subset of data fetched (their own records).

### 2.2 TELEMARKETING Role
*   **Access Principle:** Can see all Telemarketing contacts, but limited access to other modules.
*   **DataContext Filtering:**
    *   `telemarketing_contacts`: **NO FILTER** (Can see ALL records).
    *   Other tables (`properties`, `activities`, etc.): Telemarketing role fetches these in `fetchAllData`. The `fetchData` function applies `agente_id` filter for these tables. So they likely see **nothing** or only records explicitly assigned to them in these other tables.
*   **Search Scope:** Can search the entire Telemarketing database.

### 2.3 ADMIN / SUPER_ADMIN Role
*   **Access Principle:** Full access to all records.
*   **DataContext Filtering:**
    *   `fetchData` **skips** the `agente_id` filter for these roles.
    *   *Exception:* `super_admin` has a UI toggle `superAdminFilterMine` which, if enabled, forces the `agente_id` filter to show only their own records.
*   **Search Scope:** Client-side search operates on the full dataset of all agents.

---

## 3. RLS Policies Analysis

The database enforces security independently of the frontend.

| Table | Select Policy | Logic |
| :--- | :--- | :--- |
| `properties` | `prop_select` | `auth.role() = 'authenticated'` (All authenticated users can READ all properties? **CRITICAL FINDING**: The policy allows *all* authenticated users to select. Filtering happens in frontend. This is a potential privacy leak if an Agente queries the API directly.) |
| `commercial_activities` | `ca_select` | `auth.role() = 'authenticated'` (Same as above. All authenticated users can read all rows.) |
| `potential_tobacconists` | `pt_select` | `auth.role() = 'authenticated'` (Same as above.) |
| `potential_activities` | `pa_select` | `auth.role() = 'authenticated'` (Same as above.) |
| `telemarketing_contacts` | `tm_select` | `auth.role() = 'authenticated'` (Same as above.) |
| `agents` | `Enable read access...` | `auth.role() = 'authenticated'` (All users can read agent profiles). |

**Security Note:** The current RLS policies (`USING (true)` or just checking authentication) mean that while the UI filters data for Agents, a technical user could potentially query the Supabase API to see other agents' data. The strict segregation relies heavily on `DataContext.jsx` logic.

**Update/Delete Policies:** These are stricter.
*   Example: `prop_update` checks `((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin', 'super_admin'])))`.
*   This ensures Agents can only *edit* their own data, even if they can technically *read* others' via raw API.

---

## 4. Search & Filter Matrix

| Role | Table | Data Visible (Frontend) | Searchable Data |
| :--- | :--- | :--- | :--- |
| **Agente** | Properties | Own (`agente_id`) | Own Records |
| | Commercial | Own (`agente_id`) | Own Records |
| | Potential Act | Own (`agente_id`) | Own Records |
| | Telemarketing | **Not Visible** | N/A |
| **Telemarketing** | Properties | Own (`agente_id`) | Own Records (Likely empty) |
| | Telemarketing | **ALL** | All Records |
| **Admin** | All Tables | **ALL** | All Records |

---

## 5. Limitations & Gaps

1.  **Client-Side Performance:**
    *   Search is performed on the client side (`useReactTable` or `array.filter`).
    *   `DataContext` fetches **ALL** rows (looping to bypass 1000 row limit).
    *   As data grows (e.g., >10,000 records), the initial load time and search responsiveness will degrade significantly.

2.  **Inconsistent Search UX:**
    *   `PotentialActivitiesPage` uses a custom search bar logic that explicitly checks fields (`nome`, `cognome`, etc.).
    *   Other pages use `DataTable` which converts all row values to string and searches globally.
    *   *Result:* Searching for a specific "Budget" might behave differently across pages.

3.  **RLS vs Frontend Filter Mismatch:**
    *   Database policies allow "SELECT ALL" for authenticated users.
    *   Privacy relies on the frontend `DataContext` filters.
    *   *Recommendation:* Tighten RLS `SELECT` policies to match the business rules (e.g., `agente_id = auth.uid()` for Agents) to ensure true data isolation.

4.  **Telemarketing Visibility for Agents:**
    *   Currently, Agents don't fetch `telemarketing_contacts` in `DataContext`. If an agent needs to see leads assigned to them from telemarketing, this logic needs adjustment.

## 6. Recommendations

1.  **Unified Search Component:** Refactor `PotentialActivitiesPage` to use the standard `DataTable` search or upgrade `DataTable` to support server-side search for scalability.
2.  **Server-Side Search:** For Telemarketing (which grows fast), implement Supabase `.ilike()` queries instead of fetching all data to client.
3.  **Harden RLS:** Update RLS policies to enforce `SELECT` restrictions for Agents, mirroring the `UPDATE`/`DELETE` logic.
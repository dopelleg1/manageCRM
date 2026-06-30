# Comprehensive Privilege Analysis Document

This document provides a deep, structural analysis of the privilege management system across the 5 main entities: **Potential Activities**, **Telemarketing Contacts**, **Properties**, **Potential Tobacconists**, and **Appointments**. It details the schema, CRUD access matrices, and implementation mechanisms for all four roles: **Agents**, **Telemarketing**, **Admin**, and **Super Admin**.

---

## 1. TABLE: `potential_activities` (Potential Buyers/Sellers)

### A) TABLE STRUCTURE
- **Columns & Data Types**: `id` (uuid), `type` (text), `nome` (text), `cognome` (text), `telefono` (text), `email` (text), `indirizzo` (text), `lat` (numeric), `lng` (numeric), `citta` (text), `zona` (text), `regione` (text), `agente_id` (uuid - FK), `note` (text), `data_richiamo` (date), `created_at` (timestamptz), `budget` (numeric), `locali` (integer), `mq` (integer), `bagni` (integer), `aggi` (text), `ricavo` (numeric), `categoria` (text), `caratteristiche` (text), `stato_presa_in_carico` (text), `numero` (integer), `stato` (text), `anagrafica_type` (text), `locali_min` (integer), `locali_max` (integer), `mq_min` (integer), `mq_max` (integer), `bagni_status` (text), `arredo` (text), `stato_prima_visita` (text), `stato_prima_visita_data` (date), `is_master_record` (boolean), `allegati_urls` (jsonb), `phone_2` (text).
- **Viewing Fields**: All roles can technically view all fields if they have row access.
- **Modifying Fields**: 
  - *Agents*: All fields (only for owned rows). Cannot modify `agente_id` (enforced by UI).
  - *Admins/Super Admins*: All fields, including reassignment (`agente_id`).
- **Sensitive Fields**: `budget`, `ricavo`, `telefono`, `email`.

### B) COMPLETE PRIVILEGE MATRIX

| Role | CREATE | READ | UPDATE | DELETE | Visible/Editable Fields |
|------|--------|------|--------|--------|-------------------------|
| **AGENTS** | Yes | Only Own (UI) | Only Own | Only Own | All fields / Cannot change `agente_id` |
| **TELEMARKETING** | Yes | All (UI) | Only Own | Only Own | All fields / Cannot change `agente_id` |
| **ADMIN** | Yes | All | All | All | All fields / Can change `agente_id` |
| **SUPER ADMIN**| Yes | All | All | All | All fields / Can change `agente_id` |

*Note: RLS allows READ to all authenticated users; the "Only Own" limitation is strictly an application-layer filter.*

---

## 2. TABLE: `telemarketing_contacts`

### A) TABLE STRUCTURE
- **Columns & Data Types**: `id` (uuid), `nome` (text), `cognome` (text), `nome_azienda` (text), `categoria` (text), `tipologia` (text), `telefono` (text), `email` (text), `citta` (text), `indirizzo` (text), `lat` (numeric), `lng` (numeric), `regione` (text), `data_ultimo_richiamo` (date), `note` (text), `agente_id` (uuid - FK), `created_at` (timestamptz), `stato` (text), `anagrafica_type` (text), `operatore_id` (uuid - FK), `is_master_record` (boolean), `allegati_urls` (jsonb), `phone_2` (text).
- **Viewing Fields**: Agents are blocked at the routing level. Telemarketing, Admins, and Super Admins see all fields.
- **Modifying Fields**: Telemarketing operators have elevated privileges here, acting essentially as Admins for this specific table.
- **Sensitive Fields**: `telefono`, `phone_2`, `email`.

### B) COMPLETE PRIVILEGE MATRIX

| Role | CREATE | READ | UPDATE | DELETE | Visible/Editable Fields |
|------|--------|------|--------|--------|-------------------------|
| **AGENTS** | Yes (API) | None (UI Route Blocked)| None (UI Blocked) | None | N/A (UI blocked) |
| **TELEMARKETING** | Yes | All | All | All | All fields / Can assign to agents (`agente_id`) |
| **ADMIN** | Yes | All | All | All | All fields |
| **SUPER ADMIN**| Yes | All | All | All | All fields |

---

## 3. TABLE: `properties` (Real Estate)

### A) TABLE STRUCTURE
- **Columns & Data Types**: `id` (uuid), `codice` (text), `categoria` (text), `tipologia` (text), `agente_id` (uuid - FK), `citta` (text), `indirizzo` (text), `lat` (numeric), `lng` (numeric), `zona` (text), `regione` (text), `prezzo` (numeric), `created_at` (timestamptz), `mq` (integer), `locali` (integer), `bagni` (integer), `caratteristiche` (text[]), `nome_proprietario` (text), `cognome_proprietario` (text), `telefono_proprietario` (text), `email_proprietario` (text), `note` (text), `scadenza_mandato` (date), `data_richiamo` (date), `stato` (text), `numero` (integer), `is_master_record` (boolean), `allegati_urls` (jsonb), `phone_2` (text).
- **Viewing Fields**: All fields visible.
- **Modifying Fields**: Agents can modify all fields of their own listings.
- **Sensitive Fields**: `nome_proprietario`, `cognome_proprietario`, `telefono_proprietario`, `email_proprietario`.

### B) COMPLETE PRIVILEGE MATRIX

| Role | CREATE | READ | UPDATE | DELETE | Visible/Editable Fields |
|------|--------|------|--------|--------|-------------------------|
| **AGENTS** | Yes | Only Own (UI) | Only Own | Only Own | All fields / Cannot change `agente_id` |
| **TELEMARKETING** | Yes | All (UI) | Only Own | Only Own | All fields / Cannot change `agente_id` |
| **ADMIN** | Yes | All | All | All | All fields / Can change `agente_id` |
| **SUPER ADMIN**| Yes | All | All | All | All fields / Can change `agente_id` |

---

## 4. TABLE: `potential_tobacconists`

### A) TABLE STRUCTURE
- **Columns & Data Types**: `id` (uuid), `nome` (text), `cognome` (text), `telefono` (text), `email` (text), `indirizzo` (text), `lat` (numeric), `lng` (numeric), `citta` (text), `zona` (text), `regione` (text), `agente_id` (uuid - FK), `categoria` (text), `caratteristiche` (text), `stato` (text), `note` (text), `data_ultimo_richiamo` (date), `created_at` (timestamptz), `numero_rivendita` (integer), `numero_ricevitoria` (text), `tipo_rivendita` (text), `distributore` (text), `data_presa_in_carico` (date), `is_master_record` (boolean), `allegati_urls` (jsonb), `phone_2` (text).
- **Viewing Fields**: Standard visibility rules apply.
- **Modifying Fields**: Financials and distributor data heavily restricted to row owners and admins.
- **Sensitive Fields**: `distributore`, `numero_rivendita`, `numero_ricevitoria`.

### B) COMPLETE PRIVILEGE MATRIX

| Role | CREATE | READ | UPDATE | DELETE | Visible/Editable Fields |
|------|--------|------|--------|--------|-------------------------|
| **AGENTS** | Yes | Only Own (UI) | Only Own | Only Own | All fields / Cannot change `agente_id` |
| **TELEMARKETING** | Yes | All (UI) | Only Own | Only Own | All fields / Cannot change `agente_id` |
| **ADMIN** | Yes | All | All | All | All fields / Can change `agente_id` |
| **SUPER ADMIN**| Yes | All | All | All | All fields / Can change `agente_id` |

---

## 5. TABLE: `appointments`

### A) TABLE STRUCTURE
- **Columns & Data Types**: `id` (uuid), `title` (text), `start_time` (timestamptz), `end_time` (timestamptz), `agente_id` (uuid - FK), `related_record_id` (uuid), `related_table` (text), `created_at` (timestamptz).
- **Viewing Fields**: All fields visible.
- **Modifying Fields**: Title, times, and relationships.
- **Sensitive Fields**: `related_record_id`, `agente_id`.

### B) COMPLETE PRIVILEGE MATRIX

| Role | CREATE | READ | UPDATE | DELETE | Visible/Editable Fields |
|------|--------|------|--------|--------|-------------------------|
| **AGENTS** | Yes | Only Own (UI) | Only Own | Only Own | All fields |
| **TELEMARKETING** | Yes | All (UI) | Only Own | Only Own | All fields |
| **ADMIN** | Yes | All | All | All | All fields |
| **SUPER ADMIN**| Yes | All | All | All | All fields |

---

## C) IMPLEMENTATION LOCATIONS

### 1. Frontend Components
- **`src/App.jsx`**: Uses `<ProtectedRoute allowedRoles={[...]}>` to restrict entire routes. (e.g., `/telemarketing` is blocked for `agente`, `/agents` is blocked for `agente` and `telemarketing`).
- **`src/components/calendar/RecordDetailModal.jsx`**: Core UI control. Defines `canEditRecord` logic ensuring edit/delete buttons only render if `['admin', 'super_admin'].includes(userRole) || editedRecord.agente_id === user.id || record.recordType === 'Telemarketing'`. It also selectively renders the `AgentSelector` based on elevated roles.
- **`src/components/admin/AdminTableToolbar.jsx`**: Hides bulk delete/import/export features from standard Agents.

### 2. Context / State Management
- **`src/contexts/DataContext.jsx`**: Implements the primary read filter. If `userRole === 'agente'`, it automatically appends `.eq('agente_id', user.id)` to queries for `properties`, `commercial_activities`, `potential_tobacconists`, and `potential_activities`. It also completely omits fetching `telemarketing_contacts` if the role is not authorized.
- **`src/contexts/SupabaseAuthContext.jsx`**: Resolves the user's role from the public `agents` table on session init, exposing `userRole` to the entire app.

### 3. Backend RLS Policies (Supabase Schema)
- **Select (READ)**: Universally open `USING ((auth.role() = 'authenticated'::text))` across all tables. This relies entirely on the frontend `DataContext` to hide records.
- **Insert (CREATE)**: Universally open `USING (true)` across all tables.
- **Update/Delete**: Strictly enforced at DB level.
  - Standard format: `(((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))`
  - Telemarketing format: `(((auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (operatore_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text, 'telemarketing'::text])))))`

### 4. Utility Functions & Hooks
- **`src/utils/searchConfig.js`**: Defines `rolePermissions` per table (e.g., `agente: 'own'`, `admin: 'all'`).
- **`src/hooks/useClientSearch.js`**: Integrates `searchConfig` rules to restrict local searching arrays depending on role.

---

## D) TABLE RELATIONSHIPS

### Foreign Key Cascading & Inheritance
1. **Core Ownership (`agente_id`)**: Every main table holds an `agente_id` pointing to `public.agents(id)`. This single field dictates row-level ownership.
2. **Telemarketing Dual-Ownership (`operatore_id`)**: The `telemarketing_contacts` table uniquely has both `agente_id` (the assigned agent) and `operatore_id` (the telemarketer who created it). RLS grants delete privileges to both IDs.
3. **Cross-Table Constraints (`appointments`)**:
   - `appointments` links to other tables via `related_record_id` and `related_table`.
   - **Inheritance**: Privileges do *not* automatically cascade via DB constraints. If an agent owns an appointment, they can edit the appointment. However, they can only link it to a `potential_activity` or `property` they own because the frontend dropdowns only populate with records fetched by `DataContext` (which applies the `agente_id` filter).
4. **Documents & Attachments (`documents`)**:
   - The `documents` table relates via `record_id` and `table_name`.
   - Its RLS is entirely open (`auth.role() = 'authenticated'`). Privilege inheritance is purely implicit via UI: you can only see a document if you can open the parent record's `RecordDetailModal`.

---

## E) FINAL SUMMARY REPORT

### Comprehensive Privilege Matrix

| Table | Role | CREATE | READ (UI/DB) | UPDATE | DELETE | Record Ownership Filter |
|-------|------|--------|--------------|--------|--------|-------------------------|
| **properties** | Agenti | ✅ | Own / All | Own | Own | `agente_id` |
| | Telemarketing | ✅ | All / All | Own | Own | N/A |
| | Admin / SA | ✅ | All / All | All | All | N/A |
| **potential_activities** | Agenti | ✅ | Own / All | Own | Own | `agente_id` |
| | Telemarketing | ✅ | All / All | Own | Own | N/A |
| | Admin / SA | ✅ | All / All | All | All | N/A |
| **potential_tobacconists** | Agenti | ✅ | Own / All | Own | Own | `agente_id` |
| | Telemarketing | ✅ | All / All | Own | Own | N/A |
| | Admin / SA | ✅ | All / All | All | All | N/A |
| **telemarketing_contacts** | Agenti | 🚫 | 🚫 / All | 🚫 | 🚫 | Route Blocked |
| | Telemarketing | ✅ | All / All | All | All | `agente_id` OR `operatore_id` |
| | Admin / SA | ✅ | All / All | All | All | N/A |
| **appointments** | Agenti | ✅ | Own / All | Own | Own | `agente_id` |
| | Telemarketing | ✅ | All / All | Own | Own | N/A |
| | Admin / SA | ✅ | All / All | All | All | N/A |

### Security Observations & Gaps
1. **READ Policies**: The Database RLS `SELECT` policy is overly permissive (`authenticated`), relying entirely on `DataContext.jsx` to segregate data. Direct API queries bypass these visual restrictions.
2. **Telemarketing Reach**: Telemarketing operators have full UI visibility over properties, potential activities, and tobacconists because `DataContext.jsx` only applies the `.eq('agente_id', user.id)` filter if `userRole === 'agente'`.
3. **Record Reassignment**: Only Admins, Super Admins, and Telemarketers (for telemarketing records) can change the `agente_id` of an existing record. Agents are locked into their assigned records.
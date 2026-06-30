# Development Environment Documentation

## 1. Environment Configuration
The application has been configured to point to the new development Supabase instance.
- **Supabase URL:** `https://nhrhjdjfjrsghqmwoewn.supabase.co`
- **Supabase Anon Key:** `sb_publishable_xMPmTmx8ME4afkWz4vvEbA_a9xC2j_x`

These credentials are now active in the environment secrets and will be used by `src/lib/customSupabaseClient.js` automatically.

## 2. Database Schema Overview
The schema consists of the following primary tables which mirror the production structure:
- `agents`: User accounts and roles (admin, super_admin, telemarketing, agente).
- `telemarketing_contacts`: Initial contact records.
- `potential_tobacconists` / `potential_activities`: Qualified leads.
- `properties` / `commercial_activities`: Listings and properties.
- `appointments`: Scheduled calendar events.
- `documents`: File references stored in Supabase Storage.
- `configurations` / `super_admin_settings`: App settings.

**RLS Policies:** Row-Level Security is strictly enforced. Agents can only access their own records or records assigned to them unless they hold an `admin` or `super_admin` role.

## 3. Data Migration Summary
To fully migrate data across projects (from production to development), a manual extraction or a server-side script using the Supabase CLI is required because cross-project data transfers cannot be executed entirely client-side without elevated service role privileges in both environments. 

**Recommended Migration Steps:**
1. Use `supabase db dump --db-url <prod-db-url> > schema.sql` to export the exact schema.
2. Use `supabase db dump --data-only --db-url <prod-db-url> > data.sql` to export data.
3. Apply to the new dev instance: `psql -h aws-0-eu-central-1.pooler.supabase.com -U postgres.nhrhjdjfjrsghqmwoewn -f schema.sql` (and repeat for data).

## 4. Authentication & Role Configuration
Users are managed via Supabase Auth (`auth.users`), but role logic is driven by the `agents` table. 
- Ensure that after migrating the `auth.users` table, the UUIDs exactly match the `id` column in the `agents` table.
- Default roles mapped: `admin`, `super_admin`, `telemarketing`, `agente`.

## 5. Testing Checklist
- [x] Connection to DEV DB verified via environment variables.
- [ ] Authentication: Log in as a standard agent and verify limited access.
- [ ] Authentication: Log in as super_admin and verify global access.
- [ ] CRUD Operations: Create, Read, Update, and Delete operations for `commercial_activities`.
- [ ] Storage: Upload a test document to ensure buckets are correctly configured in the new instance.

## 6. Rollback Procedures
If the development database becomes corrupted or unstable:
1. Re-run the migration dump from production.
2. If the frontend configuration needs to be reverted, update the environment secrets back to the production URL and Anon Key.
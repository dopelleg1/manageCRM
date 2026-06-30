# Application Diagnostic Report: CRM & Telemarketing Platform
**Date:** May 25, 2026  
**System Type:** Real estate / Commercial Activity CRM

---

## 1. TECHNOLOGY STACK ANALYSIS
The application is built on a modern, React-based frontend interacting directly with a Backend-as-a-Service (BaaS) provider.

*   **Frontend**: React 18+ with Vite bundler
*   **State Management**: React Context API (`SupabaseAuthContext`, `DataContext`)
*   **UI Framework**: Tailwind CSS + shadcn/ui components
*   **Routing**: React Router v6
*   **Backend**: Supabase (PostgreSQL + Auth + Storage + Real-time)
*   **Real-time**: Supabase Realtime subscriptions
*   **Maps**: React Leaflet with Leaflet.js
*   **Calendar**: React Big Calendar
*   **Data Tables**: TanStack React Table
*   **Charts**: Recharts
*   **Forms**: Custom form handling with draft auto-save
*   **File Upload**: Supabase Storage
*   **CSV Import/Export**: PapaParse
*   **Animations**: Framer Motion
*   **HTTP Client**: Supabase JS SDK
*   **Date Handling**: date-fns

**Findings & Recommendations:**
*   *Finding*: Context API is heavily used for state management.
*   *Risk*: As the application scales, massive contexts (like `DataContext`) can cause unnecessary re-renders.
*   *Recommendation*: Consider transitioning high-frequency or large data fetching to a caching layer like React Query or SWR to optimize performance and reduce database read loads.

## 2. CRITICAL DEPENDENCIES
Based on `package.json`, the following packages form the core architectural foundation:

*   `react`, `react-dom`, `react-router-dom`: Core UI and routing.
*   `@supabase/supabase-js`: Core backend SDK for Auth, DB, and Storage.
*   `tailwindcss`, `postcss`, `autoprefixer`: Styling engine.
*   `lucide-react`: Iconography.
*   `framer-motion`: Smooth micro-interactions and transitions.
*   `react-big-calendar`, `react-leaflet`, `leaflet`: Specialized visual data components.
*   `recharts`: Data visualization and analytics.
*   `papaparse`: Client-side CSV processing.
*   `@radix-ui/*`: Accessible UI primitives powering the `shadcn/ui` system.
*   `date-fns`: Lightweight date formatting and arithmetic.
*   `clsx`, `tailwind-merge`: Dynamic utility class composition.
*   `jszip`, `file-saver`: Client-side backup archiving and document handling.

## 3. ENVIRONMENT VARIABLES REQUIRED
The system relies on the following environment variables to bootstrap external connections:

*   `VITE_SUPABASE_URL`: The core routing URL for the Supabase project.
*   `VITE_SUPABASE_ANON_KEY`: Public-facing key for Supabase access (secured via RLS).
*   `VITE_SUPABASE_SERVICE_ROLE_KEY`: Elevated privilege key (strictly for backend/edge function admin operations).
*   `VITE_GOOGLE_MAPS_API_KEY`: (Optional) Geocoding and Address Autocomplete via Google Maps API.

**Risk:** Exposing `VITE_SUPABASE_SERVICE_ROLE_KEY` in the Vite frontend code is a severe security risk. 
**Recommendation:** Ensure this key is strictly utilized *only* within Edge Functions or secure backend environments, never imported into React components.

## 4. EXTERNAL SERVICES USED
*   **Supabase**: Provides PostgreSQL database, authentication, file storage, and real-time websockets.
*   **Google Maps API**: Geocoding services for map components.
*   *Note*: No Stripe, SendGrid, or other payment/email services are currently integrated. Supabase handles default transactional emails (auth confirmations).

## 5. AUTHENTICATION & AUTHORIZATION
*   **Mechanism**: Supabase Auth (email/password).
*   **RBAC**: Four core roles exist: `admin`, `super_admin`, `telemarketing`, `agent`.
*   **Enforcement**: Row Level Security (RLS) policies implemented directly on PostgreSQL tables to ensure data segregation (e.g., agents can only update their own records).
*   **Session Management**: JWTs issued and refreshed via Supabase Auth.
*   **Audit**: `password_change_log` tracks sensitive credential updates.

**Recommendation:** Periodically review RLS policies using the `ANALISI_PRIVILEGI_COMPLETA.md` guidelines to ensure newly added features haven't introduced data leaks.

## 6. STORAGE & ATTACHMENTS
*   **Buckets**: Supabase Storage bucket named `documents`.
*   **File Types**: PDFs, images, documents associated with contacts and properties.
*   **Data Structure**: Attachment URLs are stored redundantly/flexibly in JSONB columns (`allegati_urls`) directly on entity tables.
*   **Limits**: Defers to Supabase defaults (typically up to 100MB per file).

## 7. REAL-TIME FEATURES
*   **Functionality**: Supabase Realtime enables live UI updates without polling.
*   **Implementation Areas**: Calendar events, record status changes, and agent assignments.
*   **Risk**: Having too many concurrent WebSocket channels per client can hit Supabase connection limits.
*   **Recommendation**: Multiplex real-time channels or restrict real-time listeners to the active view (e.g., only subscribe to map markers currently in the viewport).

## 8. EDGE FUNCTIONS (SUPABASE FUNCTIONS)
The architecture leverages Deno-based Edge Functions to securely bypass RLS or execute heavy server-side logic:
*   `geocode-address`: Address geocoding proxy.
*   `delete-and-reassign-agent`: Complex transactional agent reassignment.
*   `create-user`, `force-delete-user`, `admin-get-user`, `admin-set-password`, `admin-change-password`, `change-password`: Elevated identity management.
*   `check-potential-activities`, `fix-potential-activities-types`: Scheduled/manual data validation and normalization.
*   `global-search`: Optimized full-text search offloaded from client.
*   `create-incremental-backup`, `create-complete-backup`, `restore-backup`, `delete-backup`, `upload-backup`: Admin DB snapshot management.
*   `analyze-database`, `analyze-storage`, `analyze-cloud-storage`: System diagnostic routines.

## 9. DATABASE SCHEMA SUMMARY
*   **Core Tables (13)**: `agents`, `telemarketing_contacts`, `potential_tobacconists`, `properties`, `configurations`, `password_change_log`, `documents`, `potential_activities`, `assignment_logs`, `commercial_activities`, `appointments`, `duplicate_deletion_logs`, `backups`.
*   **Functions (6)**: `check_dependency_counts`, `delete_duplicate_records`, `get_duplicate_groups`, `get_my_role`, `get_table_stats`, `get_users_last_sign_in`.
*   **Architecture**: Relational structure with `agents` acting as the central foreign key anchor for ownership. Extensively uses JSONB (`allegati_urls`, `raw_app_meta_data`) to prevent rigid schema lock-in for dynamic fields.

## 10. DATA VOLUME ESTIMATES
*   **Current State**: Standard for this application type ranges between 50MB-500MB of relational data.
*   **Growth Projection**: The heaviest growth will originate from the `documents` table and associated Supabase Storage buckets, as well as `assignment_logs` if telemarketing turnover is high.
*   **Recommendation**: Implement archiving for resolved/dead contacts older than 24 months to keep working set queries fast.

## 11. BACKUP & RECOVERY
*   **Strategy**: Driven by custom Edge Functions (`create-complete-backup`, `restore-backup`) managed via the frontend Admin UI, utilizing Supabase Storage.
*   **RTO (Recovery Time Objective)**: ~15-30 minutes for a standard <1GB database via SQL restoration.
*   **RPO (Recovery Point Objective)**: Tied to the last manual backup.
*   **Risk**: Manual backups rely on human intervention.
*   **Recommendation**: Automate complete backups via pg_cron or a scheduled Supabase Edge Function to run nightly.

## 12. MONITORING & LOGGING
*   **Audit Trails**: Excellent coverage via `password_change_log`, `assignment_logs`, and `duplicate_deletion_logs`.
*   **Errors**: Currently reliant on implicit browser console tracking and raw Supabase dashboard logs.
*   **Risk**: Lack of proactive alerts for frontend crashes or failing Edge Functions.
*   **Recommendation**: Integrate a lightweight error tracking solution (like Sentry) specifically for React error boundary captures and unhandled promise rejections in API calls.
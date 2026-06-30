# Development Environment Setup Guide

## 1. Environment Details
- **URL**: `dev.studiobpitalia.it`
- **Supabase Instance**: `nhrhjdjfjrsghqmwoewn`
- **Purpose**: Fully isolated sandbox for new feature testing.

## 2. Security Separation
All connections to `dev.studiobpitalia.it` route exclusively through the updated `src/lib/customSupabaseClient.js` which has been reconfigured with the DEV instance keys.

## 3. Data Population
1. Ensure the `super_admin` navigates to **Migration Setup**.
2. Run **Test Connection** to ensure the DEV DB is alive.
3. Run **Export** (pulls from your configured `.env` production endpoints, if present).
4. Run **Import** (pushes that data directly into DEV).

## 4. Verification
Click "Verify Parity" in the Migration Setup panel. The system will run `get_table_stats` RPCs on both source and target, cross-referencing record counts.
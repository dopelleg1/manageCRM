# Database Migration Guide

## Steps
1. **Prepare New Instance**: Set up new Supabase project.
2. **Schema Migration**: Run `generateSchemaMigrationSQL()` and paste into the new project's SQL editor.
3. **Export Data**: Use the Data Export utility to extract all JSON data.
4. **Import Data**: Run the Data Import utility against the new connection.
5. **Verify**: Run the Verification utility to ensure record counts match.

## Tables Included
- agents
- telemarketing_contacts
- potential_tobacconists
- properties
- commercial_activities
- potential_activities
- appointments
- documents

## Rollback
If the new instance fails, the original instance remains untouched. Simply revert `customSupabaseClient.js` credentials.
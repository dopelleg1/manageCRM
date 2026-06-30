# Emergency Recovery Guide

## Overview
This document provides step-by-step instructions for restoring the application to a known stable state (v2.0). Use this guide if the application becomes unusable or if critical data corruption occurs in the frontend codebase.

## Restoration Methods

### Method 1: Restore from `crm2.0` Stable Folder (Recommended)
The `crm2.0` directory contains a frozen snapshot of the stable v2.0 release.

1. **Stop the Development Server:**
   Press `Ctrl+C` in your terminal to stop the running `npm run dev` process.

2. **Clean Current Directory (Optional but Recommended):**
   Delete the `src` folder and `dist` folder to ensure no corrupted files remain.
   *Linux/Mac:* `rm -rf src dist`
   *Windows:* `rd /s /q src dist`

3. **Copy Stable Files:**
   Copy all contents from `crm2.0/` back to the root directory.
   *Linux/Mac:* `cp -r crm2.0/* .`
   *Windows:* `xcopy crm2.0\* . /E /H /Y`

4. **Reinstall Dependencies:**
   Run `npm install` to ensure all packages match the `package.json` from the stable version.

5. **Restart Server:**
   Run `npm run dev` to verify the application is working.

### Method 2: Restore from Backup Zip
If a timestamped zip backup was created using the maintenance script:

1. Locate the backup file in the `backups/` directory (e.g., `backups/backup-2026-02-02.zip`).
2. Extract the contents of the zip file to a temporary location.
3. Copy the extracted files to your project root, overwriting existing files.

## Critical Files Verification
After restoration, verify the existence of these critical files:
- `src/main.jsx` (Entry point)
- `src/App.jsx` (Routing and Layout structure)
- `src/contexts/DataContext.jsx` (State management)
- `src/contexts/SupabaseAuthContext.jsx` (Authentication)
- `src/lib/customSupabaseClient.js` (Database connection)
- `vite.config.js` (Build configuration)

## Verification Steps
1. **Login Check:** Ensure you can log in to the application.
2. **Navigation Check:** Verify you can navigate to Dashboard, Calendar, and Activities pages.
3. **Data Check:** Open a detail modal (e.g., on Properties page) to ensure data loads correctly.

## Support
For technical support regarding this codebase restoration, contact the development team or refer to `VERSION.md` for release details.
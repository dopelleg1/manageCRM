import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';
import process from 'process';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, 'backup_files');
const SQL_FILE = path.join(__dirname, 'backup_database.sql');
const MANIFEST_FILE = path.join(__dirname, 'backup_manifest.json');

// Ensure we are in a Node.js environment
if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
    console.error('❌ This script must be run in a Node.js environment.');
    // We can't really exit if it's not Node, but we can stop execution flow
    throw new Error('Node.js environment required');
}

// Helper to load .env manually if not running with --env-file
async function loadEnv() {
    try {
        const envContent = await fs.readFile(path.join(__dirname, '.env'), 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (!process.env[key]) process.env[key] = value;
            }
        });
    } catch (error) {
        console.log('⚠️  No .env file found or readable. Relying on system environment variables.');
    }
}

// Helper to escape SQL strings
const escapeSql = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return val;
    if (Array.isArray(val) || typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    // Escape single quotes for SQL text
    return `'${String(val).replace(/'/g, "''")}'`;
};

async function backup() {
    await loadEnv();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_KEY; // Prefer SERVICE_ROLE_KEY for full backup

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY environment variables.');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    console.log('🚀 Starting Backup Process...');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Tables to export
    // Note: 'users' is usually in 'auth' schema and not accessible via public API without Service Key + direct access. 
    // We stick to public tables defined in the codebase.
    const tables = [
        'agents',
        'commercial_activities',
        'properties',
        'potential_tobacconists',
        'potential_activities',
        'telemarketing_contacts',
        'appointments',
        'configurations',
        'documents'
    ];

    let sqlContent = `-- Backup generated on ${new Date().toISOString()}\n\n`;
    const manifest = {
        timestamp: new Date().toISOString(),
        tables_exported: [],
        files_downloaded: [],
        errors: []
    };

    // 1. Export Tables to SQL
    console.log('\n📊 Exporting Tables...');
    
    for (const table of tables) {
        try {
            process.stdout.write(`   - Exporting ${table}... `);
            
            const { data, error } = await supabase.from(table).select('*');
            
            if (error) throw error;

            if (!data || data.length === 0) {
                console.log('No data (Skipped)');
                continue;
            }

            sqlContent += `-- Table: ${table}\n`;
            
            // Generate INSERT statements
            for (const row of data) {
                const keys = Object.keys(row);
                const values = Object.values(row).map(escapeSql);
                
                const columns = keys.join(', ');
                const vals = values.join(', ');
                
                sqlContent += `INSERT INTO public.${table} (${columns}) VALUES (${vals});\n`;
            }
            sqlContent += '\n';
            
            console.log(`Done (${data.length} rows)`);
            manifest.tables_exported.push({ name: table, rows: data.length });

        } catch (err) {
            console.log('FAILED');
            console.error(`   ❌ Error exporting ${table}: ${err.message}`);
            manifest.errors.push({ step: `export_table_${table}`, message: err.message });
        }
    }

    // Write SQL file
    await fs.writeFile(SQL_FILE, sqlContent);
    console.log(`💾 SQL Dump saved to: ${SQL_FILE}`);


    // 2. Download Files
    console.log('\n🗂️  Downloading Files from Storage (commercial_activities)...');
    
    // We use the 'documents' table to find paths accurately, as listing recursively via API can be tricky
    try {
        const { data: docs, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .eq('table_name', 'commercial_activities'); // Filter only requested folder/context

        if (docsError) throw docsError;

        if (docs.length === 0) {
            console.log('   No documents found in database for commercial_activities.');
        } else {
            console.log(`   Found ${docs.length} files to download.`);
            
            for (const doc of docs) {
                const filePath = doc.file_path; // e.g., commercial_activities/ID/filename.ext
                const fileName = path.basename(filePath);
                const localDir = path.join(BACKUP_DIR, path.dirname(filePath));
                const localPath = path.join(BACKUP_DIR, filePath);

                try {
                    // Ensure local subdirectory exists
                    await fs.mkdir(localDir, { recursive: true });

                    const { data: fileBlob, error: downloadError } = await supabase.storage
                        .from('documents')
                        .download(filePath);

                    if (downloadError) throw downloadError;

                    // Convert Blob to Buffer (Node.js specific)
                    const buffer = Buffer.from(await fileBlob.arrayBuffer());
                    await fs.writeFile(localPath, buffer);
                    
                    process.stdout.write('.'); // Progress dot
                    manifest.files_downloaded.push(filePath);

                } catch (err) {
                    console.error(`\n   ❌ Failed to download ${filePath}: ${err.message}`);
                    manifest.errors.push({ step: `download_file_${filePath}`, message: err.message });
                }
            }
            console.log('\n   Download complete.');
        }

    } catch (err) {
        console.error(`   ❌ Error querying documents table: ${err.message}`);
        manifest.errors.push({ step: 'query_documents', message: err.message });
    }

    // Write Manifest
    await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
    console.log(`📋 Manifest saved to: ${MANIFEST_FILE}`);

    console.log('\n✅ Backup Process Finished!');
}

backup().catch(err => {
    console.error('\n❌ Fatal Error:', err);
    process.exit(1);
});
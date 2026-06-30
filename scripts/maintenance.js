import process from 'process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Configuration
const STABLE_DIR = path.join(rootDir, 'crm2.0');
const BACKUPS_DIR = path.join(rootDir, 'backups');
const DIRS_TO_COPY = ['src', 'public', 'scripts'];
const FILES_TO_COPY = [
    'package.json',
    'vite.config.js', 
    'tailwind.config.js', 
    'postcss.config.js', 
    'index.html',
    'VERSION.md',
    'RECOVERY_GUIDE.md',
    '.eslintrc.cjs',
    'jsconfig.json'
];

/**
 * Helper to copy a directory recursively
 */
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    
    fs.mkdirSync(dest, { recursive: true });
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Create Stable Release (Task 2)
 */
function createStableRelease() {
    console.log('🏗️  Creating stable release v2.0 in crm2.0/ ...');
    
    if (fs.existsSync(STABLE_DIR)) {
        console.log('   Cleaning existing crm2.0 directory...');
        fs.rmSync(STABLE_DIR, { recursive: true, force: true });
    }
    
    fs.mkdirSync(STABLE_DIR, { recursive: true });

    // Copy Directories
    DIRS_TO_COPY.forEach(dir => {
        const srcPath = path.join(rootDir, dir);
        const destPath = path.join(STABLE_DIR, dir);
        console.log(`   Copying ${dir}...`);
        copyDir(srcPath, destPath);
    });

    // Copy Files
    FILES_TO_COPY.forEach(file => {
        const srcPath = path.join(rootDir, file);
        const destPath = path.join(STABLE_DIR, file);
        if (fs.existsSync(srcPath)) {
            console.log(`   Copying ${file}...`);
            fs.copyFileSync(srcPath, destPath);
        }
    });

    console.log('✅ Stable release v2.0 created successfully.');
}

/**
 * Create Timestamped Backup (Task 1)
 */
function createBackup() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS format
    const timestamp = `${date}-${time}`;
    const backupName = `backup-${timestamp}`;
    
    const backupPath = path.join(BACKUPS_DIR, backupName);
    const zipPath = path.join(BACKUPS_DIR, `${backupName}.zip`);

    console.log(`📦 Creating backup: ${backupName}...`);

    if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR);
    }

    // Method A: Try to use system zip command
    let zipSuccess = false;
    try {
        console.log('   Attempting to create zip archive...');
        // Zip relevant files, excluding node_modules, .git, dist, backups, and crm2.0
        const exclude = "-x 'node_modules/*' 'dist/*' '.git/*' 'backups/*' 'crm2.0/*'";
        const command = `zip -r "${zipPath}" . ${exclude}`;
        
        execSync(command, { cwd: rootDir, stdio: 'ignore' });
        console.log(`✅ Backup created at: ${zipPath}`);
        zipSuccess = true;
    } catch (error) {
        console.warn('   ⚠️  "zip" command not available or failed. Falling back to folder copy.');
    }

    // Method B: Folder Copy (Fallback or if specifically requested as folder structure)
    // We always create the folder structure if zip fails, or if we want to ensure redundancy
    if (!zipSuccess) {
        if (fs.existsSync(backupPath)) {
            fs.rmSync(backupPath, { recursive: true, force: true });
        }
        fs.mkdirSync(backupPath, { recursive: true });

        DIRS_TO_COPY.forEach(dir => {
            copyDir(path.join(rootDir, dir), path.join(backupPath, dir));
        });
        FILES_TO_COPY.forEach(file => {
            if (fs.existsSync(path.join(rootDir, file))) {
                fs.copyFileSync(path.join(rootDir, file), path.join(backupPath, file));
            }
        });
        console.log(`✅ Backup folder created at: ${backupPath}`);
    }
    
    return { backupName, zipSuccess };
}

// Run functions
try {
    console.log('🚀 Starting Maintenance Sequence...');
    createStableRelease();
    const { backupName, zipSuccess } = createBackup();
    
    // Final Verification
    console.log('\n🔍 Verifying operations...');
    
    let stableOk = false;
    if (fs.existsSync(STABLE_DIR) && fs.readdirSync(STABLE_DIR).length > 0) {
        console.log('   ✅ crm2.0/ directory exists and contains files.');
        stableOk = true;
    } else {
        console.error('   ❌ crm2.0/ is missing or empty.');
    }

    let backupOk = false;
    const backupFolderPath = path.join(BACKUPS_DIR, backupName);
    const backupZipPath = path.join(BACKUPS_DIR, `${backupName}.zip`);
    
    if (zipSuccess && fs.existsSync(backupZipPath)) {
        console.log(`   ✅ Backup zip found: ${backupZipPath}`);
        backupOk = true;
    } else if (fs.existsSync(backupFolderPath) && fs.readdirSync(backupFolderPath).length > 0) {
         console.log(`   ✅ Backup folder found: ${backupFolderPath}`);
         backupOk = true;
    } else {
        console.error('   ❌ Backup creation failed verification.');
    }

    if (stableOk && backupOk) {
        console.log('\n✨ Maintenance completed successfully!');
    } else {
        console.error('\n⚠️ Maintenance completed with errors.');
        process.exit(1);
    }

} catch (error) {
    console.error('❌ Error during maintenance tasks:', error);
    process.exit(1);
}
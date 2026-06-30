import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
try {
  const envContent = await fs.readFile(path.join(__dirname, '../.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
} catch (e) {}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "mysql://u903659692_P1NYc:M@n2010!@92.113.22.5:3306/u903659692_ooXmo"
    }
  }
});

// Helper to get defined fields of a model from Prisma DMMF
const getModelFields = (modelName) => {
  const dmmfModel = Prisma.dmmf.datamodel.models.find(
    m => m.name === modelName || m.dbName === modelName
  );
  return dmmfModel ? dmmfModel.fields.map(f => f.name) : [];
};

// Helper to get defined DateTime fields of a model from Prisma DMMF
const getDateTimeFields = (modelName) => {
  const dmmfModel = Prisma.dmmf.datamodel.models.find(
    m => m.name === modelName || m.dbName === modelName
  );
  return dmmfModel 
    ? dmmfModel.fields.filter(f => f.type === 'DateTime').map(f => f.name) 
    : [];
};

async function run() {
  console.log('🚀 Loading backup.json...');
  const jsonContent = await fs.readFile(path.join(__dirname, '../backup.json'), 'utf-8');
  const backup = JSON.parse(jsonContent);

  const defaultPasswordHash = await bcrypt.hash('Lbh1108a!', 10);

  // List of tables in dependency order (dependents first for reference safety if we were deleting)
  const tables = [
    { name: 'duplicate_deletion_logs', key: 'duplicate_deletion_logs' },
    { name: 'backups', key: 'backups' },
    { name: 'configurations', key: 'configurations' },
    { name: 'password_change_log', key: 'password_change_log' },
    { name: 'super_admin_settings', key: 'super_admin_settings' },
    { name: 'documents', key: 'documents' },
    { name: 'assignment_logs', key: 'assignment_logs' },
    { name: 'appointments', key: 'appointments' },
    { name: 'potential_activities', key: 'potential_activities' },
    { name: 'commercial_activities', key: 'commercial_activities' },
    { name: 'properties', key: 'properties' },
    { name: 'potential_tobacconists', key: 'potential_tobacconists' },
    { name: 'telemarketing_contacts', key: 'telemarketing_contacts' },
    { name: 'agents', key: 'agents' }
  ];

  // Helper to chunk arrays to prevent placeholders count limits
  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // Insert/Sync in dependency order (agents first)
  const insertOrder = [...tables].reverse();

  console.log('\n📥 Synchronizing backup data into Hostinger MySQL (Smart Sync)...');
  for (const table of insertOrder) {
    const records = backup[table.key] || [];
    if (records.length === 0) {
      console.log(`   - Table ${table.name}: No records to sync.`);
      continue;
    }

    console.log(`   - Table ${table.name}: Processing ${records.length} records...`);
    const validFields = getModelFields(table.name);
    const dateFields = getDateTimeFields(table.name);

    // Process and sanitize records
    const processedRecords = records.map(row => {
      const copy = {};
      for (const key of validFields) {
        if (row[key] !== undefined) copy[key] = row[key];
      }

      // Convert dynamic date fields to JS Date objects
      for (const key of dateFields) {
        if (copy[key] !== undefined && copy[key] !== null) {
          copy[key] = new Date(copy[key]);
        }
      }
      return copy;
    });

    // Fetch existing records from MySQL to find matches
    const existingRecords = await prisma[table.name].findMany({
      select: { id: true }
    });
    const existingIds = new Set(existingRecords.map(r => r.id));

    const toCreate = [];
    const toUpdate = [];

    for (const record of processedRecords) {
      if (existingIds.has(record.id)) {
        const recordCopy = { ...record };
        if (table.name === 'agents') {
          // Critical: Do NOT overwrite passwords of existing agents
          delete recordCopy.password;
        }
        toUpdate.push(recordCopy);
      } else {
        const recordCopy = { ...record };
        if (table.name === 'agents') {
          // Provide default password hash for new agents
          recordCopy.password = defaultPasswordHash;
          recordCopy.color = recordCopy.color || null;
          recordCopy.role = recordCopy.role || null;
        }
        toCreate.push(recordCopy);
      }
    }

    // 1. Bulk Insert new records
    if (toCreate.length > 0) {
      const chunks = chunkArray(toCreate, 200);
      let insertCount = 0;
      for (const chunk of chunks) {
        if (table.name === 'agents') {
          // Individual insert for agents to be safe
          for (const agent of chunk) {
            await prisma.agents.create({ data: agent });
          }
        } else {
          await prisma[table.name].createMany({ data: chunk });
        }
        insertCount += chunk.length;
      }
      console.log(`     ➕ Inserted ${insertCount} new records.`);
    }

    // 2. Batch Update existing records (with concurrent chunks of 50)
    if (toUpdate.length > 0) {
      let updateCount = 0;
      const batchSize = 50;
      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map(record => 
          prisma[table.name].update({
            where: { id: record.id },
            data: record
          })
        ));
        updateCount += batch.length;
      }
      console.log(`     🔄 Updated ${updateCount} existing records.`);
    }
  }

  console.log('\n🏁 Smart Sync Finished Successfully!');
}

run()
  .catch(err => {
    console.error('❌ Fatal error during data import:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

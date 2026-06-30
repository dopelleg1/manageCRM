import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://bukfxhtbkgqzlqsiukwl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2Z4aHRia2dxemxxc2l1a3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDU1ODQsImV4cCI6MjA3NDQ4MTU4NH0.LyrSvfJw91gAZ-Go5OGKV2f2ZCbhh3ZjUXxrwL75-qY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const prisma = new PrismaClient();

const tables = [
  'agents',
  'telemarketing_contacts',
  'potential_tobacconists',
  'super_admin_settings',
  'properties',
  'commercial_activities',
  'potential_activities',
  'appointments',
  'configurations',
  'password_change_log',
  'documents',
  'assignment_logs',
  'duplicate_deletion_logs',
  'backups'
];

async function migrate() {
  console.log('🚀 Starting Data Migration: Supabase -> Hostinger MySQL...');
  
  // Log in to Supabase first to authenticate session
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'do.pel@tiscali.it',
    password: 'Lbh1108a!'
  });
  
  if (authError) {
    console.error('❌ Failed to authenticate with Supabase:', authError.message);
    return;
  }
  console.log('🔑 Authenticated with Supabase successfully.');
  
  const defaultPasswordHash = await bcrypt.hash('Lbh1108a!', 10);
  
  for (const table of tables) {
    console.log(`\n⏳ Fetching data for table: ${table}...`);
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        throw new Error(error.message);
      }
      
      console.log(`   Found ${data.length} records in Supabase.`);
      if (data.length === 0 && table !== 'agents') continue;
      
      console.log(`   Inserting ${data.length === 0 ? 1 : data.length} records into MySQL...`);
      
      const mappedData = data.map(row => {
        const copy = { ...row };
        if (table === 'agents') {
          copy.password = defaultPasswordHash;
        }
        
        if (table === 'documents' && copy.file_size !== undefined && copy.file_size !== null) {
          copy.file_size = BigInt(copy.file_size);
        }
        if (table === 'backups' && copy.size !== undefined && copy.size !== null) {
          copy.size = BigInt(copy.size);
        }
        
        return copy;
      });

      if (table === 'agents') {
        if (mappedData.length === 0) {
          console.log('   ⚠️ No agents found in Supabase. Seeding default super_admin account...');
          mappedData.push({
            id: 'ff47ddc0-4d0d-47ce-b432-356c080fbf70',
            name: 'AMMINISTRATORE',
            email: 'do.pel@tiscali.it',
            password: defaultPasswordHash,
            role: 'super_admin',
            color: '#3b82f6',
            is_master_record: false
          });
        }
        for (const item of mappedData) {
          await prisma.agent.upsert({
            where: { id: item.id },
            update: {
              name: item.name,
              email: item.email,
              password: item.password,
              role: item.role,
              color: item.color,
              is_master_record: item.is_master_record
            },
            create: item
          });
        }
      } else {
        await prisma[table].deleteMany({});
        
        const chunkSize = 100;
        for (let i = 0; i < mappedData.length; i += chunkSize) {
          const chunk = mappedData.slice(i, i + chunkSize);
          await prisma[table].createMany({
            data: chunk,
            skipDuplicates: true
          });
        }
      }
      
      console.log(`   ✅ Table ${table} migrated successfully.`);
      
    } catch (err) {
      console.error(`   ❌ Failed to migrate table ${table}:`, err.message);
    }
  }
  
  console.log('\n🏁 Migration completed!');
  await prisma.$disconnect();
}

migrate();

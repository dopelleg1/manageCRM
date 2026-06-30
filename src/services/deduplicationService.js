import { supabase } from '@/lib/customSupabaseClient';

const BATCH_SIZE_DEFAULT = 50;

/**
 * Determines the unique identifier key for a given table
 */
const getUniqueKeyForTable = (tableName) => {
    switch (tableName) {
        case 'properties':
            return 'codice'; 
        case 'agents':
            return 'email';
        case 'commercial_activities':
        case 'potential_activities':
        case 'potential_tobacconists':
        case 'telemarketing_contacts':
        default:
            return 'telefono';
    }
};

/**
 * Imports records with deduplication logic
 */
export async function importWithDeduplication(tableName, records, options = {}) {
    const batchSize = options.batchSize || BATCH_SIZE_DEFAULT;
    const uniqueKey = getUniqueKeyForTable(tableName);
    
    const report = {
        totalProcessed: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
        inserted: [],
        updated: [],
        skipped: []
    };

    const batches = [];
    for (let i = 0; i < records.length; i += batchSize) {
        batches.push(records.slice(i, i + batchSize));
    }

    // Callback for progress updates
    const onProgress = options.onProgress || (() => {});

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNumber = i + 1;
        
        try {
            await processBatch(tableName, batch, uniqueKey, report);
        } catch (error) {
            console.error(`Error processing batch ${batchNumber}:`, error);
            report.errors.push(`Batch ${batchNumber} failed: ${error.message}`);
            // If critical error, maybe break? For now continue to next batch.
        }

        report.totalProcessed += batch.length;
        const percent = Math.round((report.totalProcessed / records.length) * 100);
        onProgress(percent, report);
    }

    return report;
}

/**
 * Processes a single batch of records
 */
async function processBatch(tableName, batch, uniqueKey, report) {
    // 1. Separate records with valid keys vs empty keys
    const recordsWithKey = [];
    const recordsWithoutKey = [];

    batch.forEach(record => {
        if (record[uniqueKey]) {
            recordsWithKey.push(record);
        } else {
            recordsWithoutKey.push(record);
        }
    });

    // 2. Fetch existing records for those with keys
    let existingRecordsMap = new Map();
    
    if (recordsWithKey.length > 0) {
        const keysToCheck = recordsWithKey.map(r => r[uniqueKey]);
        
        const { data: existing, error } = await supabase
            .from(tableName)
            .select('*')
            .in(uniqueKey, keysToCheck);
            
        if (error) throw error;

        if (existing) {
            existing.forEach(rec => {
                existingRecordsMap.set(String(rec[uniqueKey]).toLowerCase(), rec);
            });
        }
    }

    // 3. Classify into Insert vs Update
    const toInsert = [...recordsWithoutKey]; // Empty keys always inserted
    const updates = [];

    recordsWithKey.forEach(newRecord => {
        const keyVal = String(newRecord[uniqueKey]).toLowerCase();
        const existingRecord = existingRecordsMap.get(keyVal);

        if (existingRecord) {
            // Check if merge needed
            const { merged, hasChanges } = mergeRecords(existingRecord, newRecord);
            if (hasChanges) {
                updates.push(merged);
            } else {
                report.skippedCount++;
                report.skipped.push({ record: newRecord, reason: "Nessuna modifica rilevata (Duplicato esatto)" });
            }
        } else {
            toInsert.push(newRecord);
        }
    });

    // 4. Perform Inserts
    if (toInsert.length > 0) {
        const { error: insertError } = await supabase
            .from(tableName)
            .insert(toInsert);
        
        if (insertError) {
            report.errors.push(`Insert Error: ${insertError.message}`);
            // Fallback: Try one by one or fail batch? 
            // For now, count as errors
             toInsert.forEach(rec => {
                 report.skippedCount++;
                 report.skipped.push({ record: rec, reason: `Errore DB: ${insertError.message}` });
             });
        } else {
            report.insertedCount += toInsert.length;
            report.inserted.push(...toInsert);
        }
    }

    // 5. Perform Updates (One by one for safety/precision on merge)
    // Optimization: Could use upsert if we trust the merge logic completely, 
    // but upsert overwrites. We already merged in memory, so upserting the 'merged' object is effectively an update.
    // However, `merged` object contains ALL fields. 
    // Supabase `upsert` needs the Primary Key (ID).
    
    // We must ensure `merged` has the ID from `existingRecord`.
    // Logic inside `mergeRecords` preserves ID.

    if (updates.length > 0) {
        // We can use upsert for batch update if we have IDs
        const { error: updateError } = await supabase
            .from(tableName)
            .upsert(updates);
            
        if (updateError) {
             report.errors.push(`Update Error: ${updateError.message}`);
             updates.forEach(rec => {
                 report.skippedCount++;
                 report.skipped.push({ record: rec, reason: `Errore DB Update: ${updateError.message}` });
             });
        } else {
            report.updatedCount += updates.length;
            report.updated.push(...updates);
        }
    }
}

/**
 * Merges a new record into an existing one.
 * Rule: Only update empty fields in Existing with values from New.
 */
function mergeRecords(existing, incoming) {
    const merged = { ...existing };
    let hasChanges = false;

    Object.keys(incoming).forEach(key => {
        // Skip protected fields or ID
        if (key === 'id' || key === 'created_at' || key === 'updated_at') return;

        const existingVal = existing[key];
        const incomingVal = incoming[key];

        // If existing is empty (null, undefined, or empty string) AND incoming has value
        const isExistingEmpty = existingVal === null || existingVal === undefined || existingVal === '';
        const isIncomingHasValue = incomingVal !== null && incomingVal !== undefined && incomingVal !== '';

        if (isExistingEmpty && isIncomingHasValue) {
            merged[key] = incomingVal;
            hasChanges = true;
        }
    });

    return { merged, hasChanges };
}
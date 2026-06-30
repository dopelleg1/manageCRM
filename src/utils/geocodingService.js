import { supabase } from '@/lib/customSupabaseClient';
import { TABLE_SCHEMAS } from './IMPORT_DEFAULTS';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const REQUEST_DELAY = 1000; // 1 second rule for Nominatim

/**
 * Sleeps for a specified duration.
 * @param {number} ms 
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to get table schema safely, with fallbacks for known tables
 * @param {string} tableName 
 */
export const getTableSchema = (tableName) => {
    if (TABLE_SCHEMAS && TABLE_SCHEMAS[tableName]) {
        return TABLE_SCHEMAS[tableName];
    }
    
    // Fallback for potential_activities if not in defaults
    if (tableName === 'potential_activities') {
        return {
            label: 'Potenziali Attività',
            hasCoordinates: true,
            addressField: 'indirizzo',
            cityField: 'citta'
        };
    }
    
    return null;
};

/**
 * Geocodes an address using Nominatim with rate limiting and retry logic.
 * @param {string} address 
 * @param {string} city 
 * @param {number} retries 
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
export const geocodeAddress = async (address, city, retries = 3) => {
    if (!address && !city) return null;

    const query = [address, city].filter(Boolean).join(', ');
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: 1,
        addressdetails: 1
    });

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await sleep(REQUEST_DELAY * Math.pow(1.5, attempt)); // Exponential backoff

            const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
                headers: {
                    'User-Agent': 'HostingerHorizonCRM/1.0' // Required by Nominatim
                }
            });

            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`Rate limited for ${query}. Retrying...`);
                    continue;
                }
                throw new Error(`Nominatim API error: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon)
                };
            }
            
            return null; // Not found
        } catch (error) {
            console.error(`Geocoding error for "${query}" (Attempt ${attempt + 1}):`, error);
            if (attempt === retries - 1) return null;
        }
    }
    return null;
};

/**
 * Remaps coordinates for a specific table based on the provided configuration.
 * @param {string} tableName 
 * @param {Object} options - { mode: 'missing' | 'all' | 'selected', selectedIds: [] }
 * @param {Function} onProgress - Callback(current, total)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
export const remapTableCoordinates = async (tableName, options = { mode: 'missing', selectedIds: [] }, onProgress) => {
    const schema = getTableSchema(tableName);
    if (!schema || !schema.hasCoordinates) {
        throw new Error(`Table ${tableName} is not configured for geocoding.`);
    }

    const { addressField, cityField } = schema;
    let query = supabase.from(tableName).select(`id, ${addressField}, ${cityField}`);

    // Apply filters based on mode
    if (options.mode === 'missing') {
        query = query.is('lat', null);
    } else if (options.mode === 'selected' && options.selectedIds?.length > 0) {
        query = query.in('id', options.selectedIds);
    }
    // 'all' applies no filter

    const { data: records, error } = await query;

    if (error) {
        throw new Error(`Database fetch error: ${error.message}`);
    }

    let successCount = 0;
    let failCount = 0;
    const errorLog = [];

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const address = record[addressField];
        const city = record[cityField];

        if (onProgress) onProgress(i + 1, records.length);

        if (!address && !city) {
            failCount++;
            errorLog.push({ id: record.id, reason: 'Indirizzo e città mancanti' });
            continue;
        }

        const coords = await geocodeAddress(address, city);

        if (coords) {
            const { error: updateError } = await supabase
                .from(tableName)
                .update({ lat: coords.latitude, lng: coords.longitude })
                .eq('id', record.id);

            if (updateError) {
                failCount++;
                errorLog.push({ id: record.id, reason: updateError.message });
            } else {
                successCount++;
            }
        } else {
            failCount++;
            errorLog.push({ id: record.id, address: `${address}, ${city}`, reason: 'Indirizzo non trovato' });
        }
    }

    return { success: successCount, failed: failCount, errors: errorLog };
};
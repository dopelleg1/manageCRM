import { TABLE_SCHEMAS } from './IMPORT_DEFAULTS';
import Papa from 'papaparse';
import { supabase } from '@/lib/customSupabaseClient';
import { importWithDeduplication } from '@/services/deduplicationService';
import { saveMappingForTable } from '@/services/mappingPersistenceService';

const normalize = (str) => String(str || '').toLowerCase().trim();

export const getTableSchema = (tableName) => {
  return TABLE_SCHEMAS[tableName] || null;
};

export const parseAgentName = (value) => {
    if (!value) return "NO AGENTE";
    const str = String(value).trim();
    if (!str) return "NO AGENTE";
    const parts = str.split(',');
    return parts[0].trim() || "NO AGENTE";
};

export const parseDateField = (value) => {
    if (!value) return null;
    let str = String(value).trim();
    if (!str) return null;
    if (str.includes('T')) str = str.split('T')[0];
    const months = { 'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04', 'maggio': '05', 'giugno': '06', 'luglio': '07', 'agosto': '08', 'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12', 'gen': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mag': '05', 'giu': '06', 'lug': '07', 'ago': '08', 'set': '09', 'ott': '10', 'nov': '11', 'dic': '12' };
    const italianMatch = str.match(/^(\d{1,2})[\s\-\/\.]+(\w+)[\s\-\/\.]+(\d{4})/);
    if (italianMatch) { const day = italianMatch[1].padStart(2, '0'); const monthStr = italianMatch[2].toLowerCase(); const year = italianMatch[3]; if (months[monthStr]) return `${year}-${months[monthStr]}-${day}`; }
    const numericMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (numericMatch) { const day = numericMatch[1].padStart(2, '0'); const month = numericMatch[2].padStart(2, '0'); const year = numericMatch[3]; if (parseInt(month) > 12 || parseInt(day) > 31) return null; return `${year}-${month}-${day}`; }
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return null;
};

export const parsePhoneNumber = (value) => {
    if (!value) return "";
    let str = String(value).trim();
    const cleanStr = str.replace(/\D/g, '');
    if (cleanStr.length === 10) return cleanStr;
    if (cleanStr.length === 13 && cleanStr.startsWith('0039')) return cleanStr;
    return "";
};

export const parseBudgetField = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    let str = String(value).trim();
    str = str.replace(/[€$£\s]/g, '');
    if (!str) return 0;
    if (str.includes('.') && str.includes(',')) { const lastDot = str.lastIndexOf('.'); const lastComma = str.lastIndexOf(','); if (lastComma > lastDot) { str = str.replace(/\./g, '').replace(',', '.'); } else { str = str.replace(/,/g, ''); } } else if (str.includes(',')) { str = str.replace(',', '.'); } else if (str.includes('.')) { if ((str.match(/\./g) || []).length > 1) { str = str.replace(/\./g, ''); } else { const parts = str.split('.'); if (parts[1] && parts[1].length === 3) { str = str.replace(/\./g, ''); } } }
    const num = parseFloat(str);
    if (isNaN(num)) return -1;
    return num;
};

export const convertValue = (value, fieldType, fieldKey) => {
  if (fieldKey === 'agente_nome' || (fieldKey === 'agente_id' && typeof value === 'string')) return parseAgentName(value);
  if (['budget', 'prezzo', 'ricavo', 'ricavi', 'aggi', 'fatturato'].includes(fieldKey)) return parseBudgetField(value);
  // Ensure phone_2 is NOT strictly validated, just accept as string
  if (fieldKey === 'phone_2') return value === null || value === undefined ? null : String(value).trim();
  if (['telefono', 'cellulare', 'phone'].includes(fieldKey)) return parsePhoneNumber(value);
  if (['data_richiamo', 'created_at', 'scadenza_mandato', 'vetrina', 'data_ultimo_richiamo'].includes(fieldKey)) return parseDateField(value);
  
  if (value === null || value === undefined || value === '') return null;
  const strValue = String(value).trim();
  switch (fieldType) {
    case 'integer': const floatVal = parseBudgetField(strValue); if (floatVal === -1) return -1; return Math.round(floatVal);
    case 'numeric': return parseBudgetField(strValue);
    case 'date': case 'datetime': return parseDateField(strValue);
    case 'boolean': const lower = strValue.toLowerCase(); return ['true', '1', 'yes', 'si', 'vero', 'ok'].includes(lower);
    case 'array': 
        if (strValue.startsWith('[') && strValue.endsWith(']')) { 
            try { return JSON.parse(strValue); } catch(e) {} 
        } 
        return strValue.split(',').map(s => s.trim()).filter(s => s);
    case 'relation': case 'uuid': if (strValue.length > 0) return strValue; return null;
    case 'jsonb': try { return JSON.parse(strValue); } catch (e) { return {}; }
    default: return strValue;
  }
};

export const validateAndPreviewBatch = (tableName, rawRows, mapping) => {
    const schema = getTableSchema(tableName);
    if (!schema) return [];
    return rawRows.map((row, index) => {
        const result = { _original: row, _status: 'valid', _errors: [], _warnings: [], _parsed: {} };
        Object.keys(mapping).forEach(csvHeader => {
            const dbFieldKey = mapping[csvHeader];
            const fieldDef = schema.fields.find(f => f.key === dbFieldKey);
            if (!fieldDef) return;
            const originalValue = row[csvHeader];
            const parsedValue = convertValue(originalValue, fieldDef.type, dbFieldKey);
            result._parsed[dbFieldKey] = parsedValue;
            
            if (fieldDef.type === 'integer' && typeof parsedValue === 'number' && parsedValue !== -1) { const rawNum = parseBudgetField(originalValue); if (rawNum !== -1 && Math.abs(rawNum - parsedValue) > 0.001) { result._status = result._status === 'error' ? 'error' : 'warning'; result._warnings.push(`${fieldDef.label}: Valore decimale arrotondato (${rawNum} -> ${parsedValue})`); } }
            if ((fieldDef.type === 'integer' || fieldDef.type === 'numeric') && parsedValue === -1) { result._status = 'error'; result._errors.push(`${fieldDef.label}: Formato numerico non valido ("${originalValue}")`); }
            
            // Only apply strict phone validation to the main phone fields, not phone_2
            if (['telefono', 'cellulare'].includes(dbFieldKey) && dbFieldKey !== 'phone_2') { 
                if (parsedValue === "" && originalValue && String(originalValue).trim() !== "") { 
                    result._status = result._status === 'error' ? 'error' : 'warning'; 
                    result._warnings.push(`${fieldDef.label}: Formato telefono non valido (Richiesto: 10 cifre o 0039+13 cifre)`); 
                } 
            }
            
            if (fieldDef.required && (parsedValue === null || parsedValue === '' || parsedValue === undefined)) { 
                if (['budget', 'prezzo', 'ricavo', 'ricavi'].includes(dbFieldKey) && parsedValue === 0) { } 
                else if (['telefono'].includes(dbFieldKey) && parsedValue === "") { result._status = 'error'; result._errors.push(`${fieldDef.label}: Campo obbligatorio mancante`); } 
                else { result._status = 'error'; result._errors.push(`${fieldDef.label}: Campo obbligatorio mancante`); } 
            }
            
            if (fieldDef.maxLength && typeof parsedValue === 'string' && parsedValue.length > fieldDef.maxLength) { result._status = result._status === 'error' ? 'error' : 'warning'; result._warnings.push(`${fieldDef.label}: Testo troppo lungo (${parsedValue.length}/${fieldDef.maxLength})`); }
            if (fieldDef.type === 'date' && originalValue) { if (!parsedValue) { result._status = result._status === 'error' ? 'error' : 'warning'; result._warnings.push(`${fieldDef.label}: Formato data non riconosciuto ("${originalValue}")`); } }
        });
        return result;
    });
};

export const validateRow = (tableName, rowData, schema) => {
  const errors = [];
  const record = {};
  if (!schema) return { isValid: false, errors: ['Schema non trovato'], record: null };
  schema.fields.forEach(field => {
    if (['numero', 'id', 'record_id'].includes(field.key)) return;
    const value = rowData[field.key];
    let parsed = convertValue(value, field.type, field.key);
    if (field.required && (parsed === null || parsed === undefined || parsed === '')) { errors.push(`Campo obbligatorio mancante: ${field.label}`); }
    record[field.key] = parsed;
  });
  return { isValid: errors.length === 0, errors, record };
};

export const generateCSVTemplate = (tableName) => {
  const schema = getTableSchema(tableName);
  if (!schema) return null;
  const headers = schema.fields.map(f => f.key);
  return Papa.unparse([headers], { delimiter: ";" });
};

const checkAndAddConfig = async (type, value, configCache) => {
    if (!value) return;
    const trimmedVal = String(value).trim();
    const lowerVal = trimmedVal.toLowerCase();
    const exists = configCache[type] && configCache[type].has(lowerVal);
    if (exists) return;
    try {
        const { data: existing } = await supabase.from('configurations').select('id').eq('type', type).ilike('value', trimmedVal).maybeSingle();
        if (!existing) { await supabase.from('configurations').insert([{ type, value: trimmedVal }]); if (!configCache[type]) configCache[type] = new Set(); configCache[type].add(lowerVal); }
    } catch (e) { console.error("Auto-add config config error:", e); }
};

export const findExistingPhones = async (tableName, phoneNumbers) => {
    if (!phoneNumbers || phoneNumbers.length === 0) return new Set();
    
    try {
        const chunkSize = 200;
        const existingSet = new Set();
        
        for (let i = 0; i < phoneNumbers.length; i += chunkSize) {
            const chunk = phoneNumbers.slice(i, i + chunkSize);
            
            const { data, error } = await supabase
                .from(tableName)
                .select('telefono')
                .in('telefono', chunk)
                .not('is_master_record', 'is', false);

            if (error) throw error;
            
            if (data) {
                data.forEach(r => existingSet.add(r.telefono));
            }
        }
        return existingSet;
    } catch (e) {
        console.warn("Error checking existing phones:", e);
        return new Set();
    }
}

export const importDataWithMapping = async (tableName, mappedRows, agentId, operatoreId, additionalData = {}) => {
  const schema = getTableSchema(tableName);
  if (!schema) return { success: false, error: "Schema non valido" };

  const validRecords = [];
  const failedRows = [];

  const { data: agents } = await supabase.from('agents').select('id, name, email');
  const agentMap = {}; 
  if (agents) { agents.forEach(a => { agentMap[normalize(a.name)] = a.id; agentMap[normalize(a.email)] = a.id; }); }
  
  const configCache = {};
  const { data: configs } = await supabase.from('configurations').select('type, value');
  if (configs) { configs.forEach(c => { if (!configCache[c.type]) configCache[c.type] = new Set(); configCache[c.type].add(c.value.toLowerCase()); }); }

  for (let i = 0; i < mappedRows.length; i++) {
    const rawRow = mappedRows[i];
    const rowWithExtras = { ...rawRow, ...additionalData };
    const { isValid, errors, record } = validateRow(tableName, rowWithExtras, schema);

    if (!isValid) {
        failedRows.push({ rowIndex: i + 1, errors, data: rowWithExtras });
        continue;
    }

    if (schema.fields.some(f => f.key === 'agente_id')) {
        let resolvedAgentId = agentId;
        let csvAgentVal = record['agente_id'];
        if (!csvAgentVal && record['agente_nome']) csvAgentVal = record['agente_nome'];
        if (csvAgentVal && csvAgentVal !== "NO AGENTE") {
             const normalizedInput = normalize(csvAgentVal);
             if (agentMap[normalizedInput]) resolvedAgentId = agentMap[normalizedInput];
        }
        record.agente_id = resolvedAgentId;
    }
    
    if (schema.fields.some(f => f.key === 'operatore_id')) record.operatore_id = operatoreId || agentId;
    
    if (['commercial_activities', 'properties', 'potential_tobacconists', 'telemarketing_contacts', 'potential_activities'].includes(tableName)) {
        if (tableName === 'commercial_activities') { if (record.categoria) await checkAndAddConfig('categoria_attivita', record.categoria, configCache); if (record.stato) await checkAndAddConfig('stato_attivita', record.stato, configCache); }
        else if (tableName === 'properties') { if (record.categoria) await checkAndAddConfig('categoria_immobile', record.categoria, configCache); if (record.tipologia) await checkAndAddConfig('tipologia_immobile', record.tipologia, configCache); if (record.stato) await checkAndAddConfig('stato_immobile', record.stato, configCache); }
        else if (tableName === 'potential_tobacconists') { if (record.categoria) await checkAndAddConfig('categoria_attivita', record.categoria, configCache); if (record.stato) await checkAndAddConfig('stato_attivita', record.stato, configCache); if (record.distributore) await checkAndAddConfig('distributore_tabaccheria', record.distributore, configCache); }
        else if (tableName === 'telemarketing_contacts' || tableName === 'potential_activities') { if (record.categoria) await checkAndAddConfig('categoria_attivita', record.categoria, configCache); if (record.stato) await checkAndAddConfig('stato_attivita', record.stato, configCache); }
    }

    if (!record.created_at) record.created_at = new Date().toISOString();
    schema.fields.filter(f => f.virtual).forEach(f => { delete record[f.key]; });
    delete record.numero;
    delete record.id;
    validRecords.push(record);
  }

  try {
      const dedupReport = await importWithDeduplication(tableName, validRecords, { batchSize: 50 });
      
      return {
          success: true, 
          totalProcessed: mappedRows.length,
          insertedCount: dedupReport.insertedCount,
          updatedCount: dedupReport.updatedCount,
          skippedCount: dedupReport.skippedCount + failedRows.length,
          failedCount: failedRows.length + dedupReport.errors.length, 
          errors: [...dedupReport.errors, ...failedRows.map(f => `Riga ${f.rowIndex}: ${f.errors.join(', ')}`)],
          failedRows, 
          detailedReport: { ...dedupReport, skipped: [...dedupReport.skipped, ...failedRows.map(f => ({ record: f.data, reason: `Validazione fallita: ${f.errors.join(', ')}` }))] }
      };

  } catch (error) {
      console.error("Critical Import Error:", error);
      return { success: false, error: error.message };
  }
};
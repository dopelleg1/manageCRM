import { supabase } from '@/lib/customSupabaseClient';

const STORAGE_PREFIX = 'csv_mapping_';

export const saveMappingForTable = (tableName, mapping) => {
  try {
    const key = `${STORAGE_PREFIX}${tableName}`;
    const data = JSON.stringify(mapping);
    localStorage.setItem(key, data);
    return true;
  } catch (error) {
    console.error('Error saving mapping:', error);
    return false;
  }
};

export const getMappingForTable = (tableName) => {
  try {
    const key = `${STORAGE_PREFIX}${tableName}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error retrieving mapping:', error);
    return null;
  }
};

export const hasMappingForTable = (tableName) => {
  return !!getMappingForTable(tableName);
};

export const clearMappingForTable = (tableName) => {
  try {
    const key = `${STORAGE_PREFIX}${tableName}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing mapping:', error);
    return false;
  }
};

export const clearAllMappings = () => {
    try {
        Object.keys(localStorage).forEach(key => {
            if(key.startsWith(STORAGE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        return true;
    } catch(error) {
        console.error('Error clearing all mappings:', error);
        return false;
    }
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useConfigurableFields = () => {
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfigurations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .order('value', { ascending: true });
        
      if (error) throw error;
      setConfigurations(data || []);
    } catch (err) {
      setError(err);
      console.error('Error fetching configurations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigurations();

    const channel = supabase
      .channel('schema-db-changes-configurations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'configurations',
        },
        (payload) => {
            if(payload.eventType === 'INSERT') {
                setConfigurations(prev => {
                    // Prevent duplicates just in case
                    const exists = prev.some(p => p.id === payload.new.id);
                    if (exists) return prev;
                    return [...prev, payload.new].sort((a,b) => a.value.localeCompare(b.value));
                });
            } else {
                fetchConfigurations();
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfigurations]);

  const getFieldOptions = useCallback((fieldName) => {
    return configurations
      .filter(item => item.type === fieldName)
      .map(item => item.value)
      .sort((a, b) => a.localeCompare(b));
  }, [configurations]);

  const fieldExists = useCallback((fieldName, value) => {
    if (!value) return true; // Empty value is considered "valid" (not a missing option)
    const options = getFieldOptions(fieldName);
    return options.some(opt => opt.toLowerCase() === String(value).trim().toLowerCase());
  }, [getFieldOptions]);

  const addNewOption = useCallback(async (fieldName, value) => {
    if (!value) return null;
    try {
      const trimmedValue = value.trim();
      // Check if exists one last time to avoid race conditions/duplicates
      const { data: existing } = await supabase
        .from('configurations')
        .select('id')
        .eq('type', fieldName)
        .ilike('value', trimmedValue)
        .maybeSingle();

      if (existing) return existing;

      const { data, error } = await supabase
        .from('configurations')
        .insert([{ type: fieldName, value: trimmedValue }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Error adding new option for ${fieldName}:`, err);
      throw err;
    }
  }, []);

  return {
    configurations,
    getFieldOptions,
    fieldExists,
    addNewOption,
    loading,
    error
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useDebounce } from '@/hooks/useDraftAutoSave';
import { retryOperation } from '@/utils/networkUtils';

export const useDuplicatePhoneCheck = (tableName, currentPhoneNumber, currentRecordId = null) => {
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateRecord, setDuplicateRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheBuster, setCacheBuster] = useState(0);

  // Debounce the phone number input by 500ms
  const debouncedPhone = useDebounce(currentPhoneNumber, 500);

  // Listen for cache invalidation events (e.g., after deletion)
  useEffect(() => {
    const handleInvalidation = () => {
      setCacheBuster(prev => prev + 1);
    };
    
    window.addEventListener('duplicate-cache-invalidated', handleInvalidation);
    return () => window.removeEventListener('duplicate-cache-invalidated', handleInvalidation);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkDuplicate = async () => {
      // Reset state if phone is empty or too short
      if (!debouncedPhone || debouncedPhone.length < 3) {
        if (isMounted) {
          setIsDuplicate(false);
          setDuplicateRecord(null);
          setError(null);
        }
        return;
      }

      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }

      try {
        // Normalize phone number (remove spaces, dashes, special chars)
        const normalizedPhone = debouncedPhone.replace(/[^0-9+]/g, '');
        
        // If normalization resulted in empty string, return
        if (!normalizedPhone) {
             if (isMounted) setIsLoading(false);
             return;
        }

        await retryOperation(async () => {
          let selectFields = 'id, nome, cognome, telefono, email, indirizzo, is_master_record';
          let phoneField = 'telefono';

          // Handle schema differences for commercial_activities and properties
          if (tableName === 'commercial_activities' || tableName === 'properties') {
            selectFields = 'id, nome_proprietario, cognome_proprietario, telefono_proprietario, email_proprietario, indirizzo, is_master_record';
            phoneField = 'telefono_proprietario';
          }

          let query = supabase
            .from(tableName)
            .select(selectFields)
            .eq(phoneField, normalizedPhone);

          // Exclude current record if editing
          if (currentRecordId) {
            query = query.neq('id', currentRecordId);
          }
          
          const { data, error: queryError } = await query.maybeSingle();

          if (queryError) {
             if (queryError.code === 'PGRST116') { // JSON object requested, multiple (or no) rows returned
             }
             throw queryError;
          }

          if (isMounted) {
            if (data) {
              if (!data.id) {
                 setIsDuplicate(false);
                 setDuplicateRecord(null);
              } else {
                 setIsDuplicate(true);
                 setDuplicateRecord(data);
              }
            } else {
              setIsDuplicate(false);
              setDuplicateRecord(null);
            }
          }
        });

      } catch (err) {
        console.error('Error checking duplicate phone:', err);
        if (isMounted) {
          setError(err.message || 'Errore di connessione durante la verifica duplicati');
          setIsDuplicate(false);
          setDuplicateRecord(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkDuplicate();

    return () => {
      isMounted = false;
    };
  }, [debouncedPhone, tableName, currentRecordId, cacheBuster]);

  return { isDuplicate, duplicateRecord, isLoading, error };
};
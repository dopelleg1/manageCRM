import { useState, useCallback } from 'react';
import { findDuplicatesByKey } from '@/utils/duplicateDetectionService';
import { deleteDuplicateRecords, setMasterRecord } from '@/utils/duplicateManagementService';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useDuplicateDetection = (tableName, keyField) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const findDuplicates = useCallback(async () => {
    if (!tableName || !keyField) {
      console.warn("useDuplicateDetection: Missing tableName or keyField");
      return [];
    }

    setLoading(true);
    setError(null);
    console.log(`[useDuplicateDetection] finding duplicates for ${tableName} on ${keyField}`);

    try {
      const result = await findDuplicatesByKey(tableName, keyField);
      
      // Safety check for result structure
      if (!result || !Array.isArray(result.groups)) {
        throw new Error("Invalid response structure from duplicate detection service");
      }

      setGroups(result.groups);
      return result.groups;
    } catch (err) {
      console.error("[useDuplicateDetection] Hook Error:", err);
      setError(err);
      
      let errorMessage = "Impossibile completare la ricerca.";
      if (err.message && err.message.includes("Failed to fetch")) {
        errorMessage = "Errore di connessione. Verifica la tua rete.";
      }

      toast({
        title: "Errore ricerca duplicati",
        description: errorMessage,
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [tableName, keyField, toast]);

  const resolveGroup = useCallback(async (groupKey, masterRecordId, idsToDelete) => {
    if (!user) {
        toast({ title: "Errore Auth", description: "Utente non autenticato.", variant: "destructive" });
        return false;
    }

    setLoading(true);
    try {
      console.log(`[useDuplicateDetection] Resolving group ${groupKey}. Master: ${masterRecordId}, Deleting: ${idsToDelete.length}`);

      // 1. Mark master (optional, mostly for history/metadata if we kept records)
      try {
        await setMasterRecord(tableName, masterRecordId);
      } catch (e) {
        console.warn("[useDuplicateDetection] Failed to set master flag, proceeding with deletion anyway.", e);
      }

      // 2. Delete others
      await deleteDuplicateRecords(tableName, idsToDelete, masterRecordId, user.id);

      // 3. Remove group from local state
      setGroups(prev => prev.filter(g => g.key !== groupKey));

      toast({
        title: "Gruppo risolto",
        description: `Mantenuto 1 record, eliminati ${idsToDelete.length}.`,
        className: "bg-green-50 border-green-200"
      });

      return true;
    } catch (err) {
      console.error("[useDuplicateDetection] Resolution Error:", err);
      toast({
        title: "Errore risoluzione",
        description: "Si è verificato un errore durante la cancellazione dei duplicati.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [tableName, user, toast]);

  return {
    groups,
    loading,
    error,
    findDuplicates,
    resolveGroup,
    setGroups // allow manual updates if needed
  };
};
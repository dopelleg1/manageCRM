import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getSearchableFields, getRolePermission } from '@/utils/searchConfig';

export const useClientSearch = (data, tableName) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { user, userRole } = useAuth();

  const filteredData = useMemo(() => {
    if (!data) return [];
    
    // 1. First, apply Role-Based Permissions (if not already handled by DataContext/RLS)
    // Note: DataContext usually fetches 'all' for admins and 'own' for agents.
    // This adds an extra layer of safety or handles 'telemarketing' specifics.
    let roleFiltered = data;
    
    // Example: If an admin wants to see ONLY their own data (optional feature not fully enforced here, 
    // relying mostly on DataContext, but we respect the config if we needed strict client-side filtering)
    // For now, we assume DataContext provides the correct base set.
    
    // 2. Apply Search Filter
    if (!searchTerm) return roleFiltered;

    const lowerTerm = searchTerm.toLowerCase();
    const fields = getSearchableFields(tableName);

    return roleFiltered.filter(item => {
      // Helper to safely check a value
      const checkValue = (val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerTerm);
      };

      // Check all configured fields
      return fields.some(field => {
        // Handle special composite fields or nested objects if necessary
        if (field === 'full_code') {
           return checkValue(`${item.codice}-${item.numero}`) || checkValue(`${item.codice} - ${item.numero}`);
        }
        return checkValue(item[field]);
      });
    });
  }, [data, searchTerm, tableName, userRole, user?.id]);

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    totalCount: data?.length || 0,
    filteredCount: filteredData.length
  };
};
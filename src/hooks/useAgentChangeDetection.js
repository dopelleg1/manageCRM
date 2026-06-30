import { useMemo } from 'react';

export const useAgentChangeDetection = (initialAgentId, newAgentId, userRole) => {
    return useMemo(() => {
        const hasChanged = initialAgentId !== newAgentId;
        // Modal should only show if there's a change AND the current user is an agent
        const shouldShowModal = hasChanged && userRole === 'agente';
        
        return {
            hasChanged,
            oldAgentId: initialAgentId,
            newAgentId: newAgentId,
            shouldShowModal
        };
    }, [initialAgentId, newAgentId, userRole]);
};
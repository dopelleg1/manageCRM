import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DuplicatePhoneWarning = ({ isDuplicate, duplicateRecord, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2 px-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Verifica numero...</span>
      </div>
    );
  }

  // Gracefully handle case where isDuplicate is true but record data is missing/deleted
  if (isDuplicate && !duplicateRecord) {
      return (
        <div className={cn(
          "mt-2 p-3 rounded-md border",
          "bg-gray-50 border-gray-200 text-gray-600",
          "flex items-start gap-3"
        )}>
           <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
           <div className="text-sm">
             <p>Record duplicato rilevato, ma i dettagli non sono disponibili (potrebbe essere stato eliminato).</p>
           </div>
        </div>
      );
  }

  if (!isDuplicate || !duplicateRecord) {
    return null;
  }

  // Safe access to properties (handling standard and owner-specific fields)
  const nome = duplicateRecord.nome || duplicateRecord.nome_proprietario || '';
  const cognome = duplicateRecord.cognome || duplicateRecord.cognome_proprietario || '';
  const fullName = `${nome} ${cognome}`.trim() || 'Senza nome';

  return (
    <div className={cn(
      "mt-2 p-3 rounded-md border",
      "bg-amber-50 border-amber-200 text-amber-900",
      "flex items-start gap-3"
    )}>
      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium">⚠️ Questo numero di telefono è già registrato</p>
        <p className="mt-1 text-amber-800">
          Appartiene a: <span className="font-semibold">{fullName}</span>
        </p>
      </div>
    </div>
  );
};

export default DuplicatePhoneWarning;
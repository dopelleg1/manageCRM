import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDraftAutoSave';

const SearchBar = ({ 
  onSearch, 
  placeholder = "Cerca...", 
  className,
  resultsCount,
  totalCount,
  fields = [] // Array of { name, label } for multi-field search
}) => {
  // Mode detection
  const isMultiField = fields && fields.length > 0;

  // State
  const [singleTerm, setSingleTerm] = useState('');
  const [multiTerms, setMultiTerms] = useState({});
  
  // Debounce values
  const debouncedSingle = useDebounce(singleTerm, 300);
  const debouncedMulti = useDebounce(multiTerms, 300);

  // Effect for Single Field Search
  useEffect(() => {
    if (!isMultiField) {
      onSearch(debouncedSingle);
    }
  }, [debouncedSingle, onSearch, isMultiField]);

  // Effect for Multi Field Search
  useEffect(() => {
    if (isMultiField) {
      onSearch(debouncedMulti);
    }
  }, [debouncedMulti, onSearch, isMultiField]);

  const handleSingleClear = () => {
    setSingleTerm('');
    onSearch('');
  };

  const handleMultiChange = (field, value) => {
    setMultiTerms(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiClear = () => {
    setMultiTerms({});
    onSearch({});
  };

  // Render Multi-Field Interface
  if (isMultiField) {
    return (
      <div className={cn("w-full space-y-2", className)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {fields.map((field) => (
            <div key={field.name} className="relative">
               <Input
                type="text"
                placeholder={field.label}
                value={multiTerms[field.name] || ''}
                onChange={(e) => handleMultiChange(field.name, e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          ))}
        </div>
         <div className="flex justify-between items-center px-1">
            <div className="text-xs text-muted-foreground">
                {(resultsCount !== undefined) && `Trovati ${resultsCount} su ${totalCount}`}
            </div>
            {Object.values(multiTerms).some(v => v) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMultiClear}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset filtri
                <X className="ml-1 h-3 w-3" />
              </Button>
            )}
         </div>
      </div>
    );
  }

  // Render Single-Field Interface (Legacy/Default)
  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          className="pl-9 pr-10"
          value={singleTerm}
          onChange={(e) => setSingleTerm(e.target.value)}
        />
        {singleTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={handleSingleClear}
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      {(singleTerm && resultsCount !== undefined) && (
        <div className="absolute top-full mt-1 right-0 text-xs text-muted-foreground">
          Trovati {resultsCount} su {totalCount} record
        </div>
      )}
    </div>
  );
};

export default SearchBar;
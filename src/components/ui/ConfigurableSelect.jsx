import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfigurableFields } from '@/hooks/useConfigurableFields';

const ConfigurableSelect = ({ fieldName, value, onChange, placeholder, required, className }) => {
    const { getFieldOptions, loading } = useConfigurableFields();
    const [inputValue, setInputValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    
    // Height & Positioning State
    const [dropdownHeight, setDropdownHeight] = useState('auto');
    const [dropdownPosition, setDropdownPosition] = useState('bottom'); // 'top' or 'bottom'
    
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Sync internal state with external value prop
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Memoize the base options to prevent recalculation on every render
    const options = useMemo(() => getFieldOptions(fieldName), [getFieldOptions, fieldName]);

    // Derived state: calculate filtered options directly during render instead of using useEffect
    // This prevents the "Maximum update depth exceeded" infinite loop
    const filteredOptions = useMemo(() => {
        if (!inputValue) {
            return options;
        }
        const lowerInput = inputValue.toLowerCase();
        return options.filter(opt => opt.toLowerCase().includes(lowerInput));
    }, [inputValue, options]);

    // Dynamic Height & Positioning Logic
    useLayoutEffect(() => {
        if (!isFocused || !containerRef.current) return;

        const updateDimensions = () => {
            const containerRect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // Calculate available space below
            const spaceBelow = viewportHeight - containerRect.bottom - 16; // 16px buffer
            const spaceAbove = containerRect.top - 16;
            
            // Heuristics:
            // 1. Calculate max possible height (70% of available space below, or if too small, try above)
            // 2. Default logic: Prefer bottom. If space below < 200px and space above > space below, flip to top.
            
            let position = 'bottom';
            let maxAvailableHeight = spaceBelow;

            if (spaceBelow < 200 && spaceAbove > spaceBelow) {
                position = 'top';
                maxAvailableHeight = spaceAbove;
            }
            
            // Cap height at 70% of available vertical space to avoid fully covering the screen
            // But ensure at least a reasonable min-height (e.g., 150px) if possible
            const calculatedMaxHeight = Math.max(150, Math.floor(maxAvailableHeight * 0.9)); 
            
            setDropdownPosition(position);
            setDropdownHeight(`${calculatedMaxHeight}px`);
        };

        updateDimensions();
        
        // Add resize listener
        window.addEventListener('resize', updateDimensions);
        window.addEventListener('scroll', updateDimensions, true); // Capture scroll to update if container moves

        return () => {
            window.removeEventListener('resize', updateDimensions);
            window.removeEventListener('scroll', updateDimensions, true);
        };
    }, [isFocused, filteredOptions.length]);

    const handleFocus = () => setIsFocused(true);

    // Delay blur to allow click on option
    const handleBlur = () => {
        // Small timeout to allow click event on dropdown items to process
        setTimeout(() => setIsFocused(false), 200);
    };

    const handleSelect = (option) => {
        setInputValue(option);
        onChange(option);
        setIsFocused(false);
    };

    const handleChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholder || "Seleziona o scrivi..."}
                    required={required}
                    className="pr-8"
                />
                <div className="absolute right-2 top-2.5 text-gray-400 pointer-events-none">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </div>

            {isFocused && (
                <div 
                    ref={dropdownRef}
                    className={cn(
                        "absolute z-[2000] w-full bg-white dark:bg-slate-950 border rounded-md shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95",
                        dropdownPosition === 'top' ? "bottom-full mb-1" : "top-full mt-1"
                    )}
                    style={{ maxHeight: dropdownHeight }}
                >
                    <ScrollArea 
                        className="w-full"
                        style={{ height: filteredOptions.length > 5 ? 'auto' : 'auto', maxHeight: dropdownHeight }}
                    >
                        {filteredOptions.length > 0 ? (
                            <div className="p-1">
                                {filteredOptions.map((option) => (
                                    <div
                                        key={option}
                                        className="px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm transition-colors"
                                        onMouseDown={(e) => {
                                            e.preventDefault(); // Prevent blur
                                            handleSelect(option);
                                        }}
                                    >
                                        {option}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-3 text-sm text-gray-500 text-center flex flex-col items-center gap-1">
                                <span>Nessuna opzione esistente trovata.</span>
                                <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                    <Plus className="h-3 w-3" /> "{inputValue}" sarà aggiunto al salvataggio
                                </span>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
};

export default ConfigurableSelect;
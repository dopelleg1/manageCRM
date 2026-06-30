import React, { useState, useCallback } from 'react';
    import { Input } from '@/components/ui/input';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2 } from 'lucide-react';

    const DEBOUNCE_DELAY = 500;

    const AddressAutocomplete = ({ initialValue, onAddressSelect }) => {
        const [query, setQuery] = useState(initialValue || '');
        const [suggestions, setSuggestions] = useState([]);
        const [isLoading, setIsLoading] = useState(false);
        const [debounceTimeout, setDebounceTimeout] = useState(null);
        const { toast } = useToast();

        const fetchSuggestions = async (searchQuery) => {
            if (searchQuery.length < 3) {
                setSuggestions([]);
                return;
            }
            setIsLoading(true);

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=it&addressdetails=1`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                
                const formattedSuggestions = data.map(item => ({
                    display_name: item.display_name,
                    lat: item.lat,
                    lon: item.lon,
                    address: {
                        road: item.address.road,
                        house_number: item.address.house_number,
                        city: item.address.city || item.address.town || item.address.village,
                        postcode: item.address.postcode,
                        state: item.address.state,
                        country: item.address.country,
                        suburb: item.address.suburb || item.address.quarter,
                    }
                }));
                setSuggestions(formattedSuggestions);

            } catch (error) {
                console.error("Failed to fetch address suggestions:", error);
                toast({
                    variant: "destructive",
                    title: "Errore nella ricerca",
                    description: "Non è stato possibile recuperare i suggerimenti. Riprova più tardi.",
                });
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debouncedFetch = useCallback((searchQuery) => {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
            const newTimeout = setTimeout(() => {
                fetchSuggestions(searchQuery);
            }, DEBOUNCE_DELAY);
            setDebounceTimeout(newTimeout);
        }, [debounceTimeout]);

        const handleInputChange = (e) => {
            const value = e.target.value;
            setQuery(value);
            debouncedFetch(value);
        };

        const handleSuggestionClick = (suggestion) => {
            const fullAddress = `${suggestion.address.road || ''}${suggestion.address.house_number ? `, ${suggestion.address.house_number}` : ''}`;
            setQuery(suggestion.display_name);
            setSuggestions([]);
            onAddressSelect({
                indirizzo: fullAddress.trim(),
                citta: suggestion.address.city,
                regione: suggestion.address.state,
                zona: suggestion.address.suburb,
                lat: parseFloat(suggestion.lat),
                lng: parseFloat(suggestion.lon),
            });
        };

        return (
            <div className="relative w-full">
                <div className="relative">
                    <Input
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        placeholder="Inizia a digitare un indirizzo..."
                        className="pr-10"
                    />
                    {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />}
                </div>
                {suggestions.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={index}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleSuggestionClick(suggestion)}
                            >
                                {suggestion.display_name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    export default AddressAutocomplete;
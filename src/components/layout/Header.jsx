import React, { useState } from 'react';
import { Menu, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import { useDebounce } from '@/hooks/useDraftAutoSave'; 
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Header = ({ setSidebarOpen }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use the imported hook instead of local implementation
  const debouncedTerm = useDebounce(globalSearchTerm, 500);

  React.useEffect(() => {
    const performGlobalSearch = async () => {
        if (!debouncedTerm || debouncedTerm.length < 3) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('global-search', {
                body: { searchTerm: debouncedTerm }
            });

            if (error) throw error;
            setResults(data || []);
        } catch (err) {
            console.error("Global search error:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    if (user) performGlobalSearch();
  }, [debouncedTerm, user]);

  const handleResultClick = (result) => {
      setGlobalSearchTerm('');
      setResults([]);
      setIsSearchOpen(false);
      
      // Navigate based on table name
      switch(result.table) {
          case 'properties': navigate('/properties'); break;
          case 'commercial_activities': navigate('/activities'); break;
          case 'potential_tobacconists': navigate('/potential-tobacconists'); break;
          case 'potential_activities': navigate('/potential-activities'); break;
          case 'telemarketing_contacts': navigate('/telemarketing'); break;
          default: break;
      }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
            {/* Hamburger menu button - Visible only on mobile (<768px) */}
            <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Open menu"
            >
            <Menu className="h-6 w-6" />
            </button>
            {/* Replaced H1 "CRM" with Studio BP horizontal logo */}
            <Link to="/" className="md:hidden text-gray-800 dark:text-white truncate">
              <img
                src="https://horizons-cdn.hostinger.com/82c787d0-7626-4a6c-b758-36c02c602514/82eeb5bc7de1efa20007d0d7b6aa676b.webp"
                alt="Studio BP Business & Houses Logo"
                className="h-9 w-auto object-contain" // Set height to 36px (h-9) and maintain aspect ratio
              />
            </Link>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-auto relative">
            <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cerca globalmente (min. 3 caratteri)..." 
                    className="pl-9 w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:bg-white transition-colors"
                    value={globalSearchTerm}
                    onChange={(e) => {
                        setGlobalSearchTerm(e.target.value);
                        if(e.target.value) setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)} // Delay to allow click
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {/* Dropdown Results */}
            {isSearchOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
                    <div className="p-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                        Risultati ({results.length})
                    </div>
                    {results.map((result, idx) => (
                        <div 
                            key={idx}
                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 last:border-0"
                            onClick={() => handleResultClick(result)}
                            onMouseDown={(e) => e.preventDefault()} // Prevent blur
                        >
                            <div className="flex justify-between">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{result.title}</span>
                                <span className="text-xs text-gray-500 capitalize">{result.type}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{result.subtitle}</p>
                        </div>
                    ))}
                </div>
            )}
             {isSearchOpen && !loading && debouncedTerm.length >= 3 && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-4 text-center text-sm text-muted-foreground z-50">
                    Nessun risultato trovato.
                </div>
            )}
        </div>
        
        {/* Placeholder for right side (Profile, etc.) */}
        <div className="w-10"></div>
      </div>
    </header>
  );
};

export default Header;
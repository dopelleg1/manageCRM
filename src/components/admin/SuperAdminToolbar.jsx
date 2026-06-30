import React from 'react';
import { useData } from '@/contexts/DataContext';
import { Eye, User, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SuperAdminToolbar = () => {
    const { superAdminFilterMine, toggleSuperAdminFilter } = useData();

    return (
        <div className="w-full bg-slate-900 text-white px-6 py-2 flex items-center justify-between border-b border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-yellow-500 text-yellow-400 font-bold flex gap-1 items-center px-3 py-1">
                    <ShieldAlert className="h-3 w-3" /> SUPER ADMIN MODE
                </Badge>
                <span className="text-xs text-slate-400 hidden sm:inline-block">
                    Hai accesso completo a tutti i dati del sistema.
                </span>
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium mr-2 text-slate-300">Modalità Visualizzazione:</span>
                <Button 
                    variant={superAdminFilterMine ? "secondary" : "default"}
                    size="sm"
                    onClick={toggleSuperAdminFilter}
                    className={`transition-all duration-200 ${!superAdminFilterMine ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                    {!superAdminFilterMine ? (
                        <>
                            <Eye className="h-4 w-4 mr-2" /> Mostra Tutto
                        </>
                    ) : (
                        <>
                            <User className="h-4 w-4 mr-2" /> Solo i Miei
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default SuperAdminToolbar;
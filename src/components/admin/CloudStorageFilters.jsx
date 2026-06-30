import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

const CloudStorageFilters = ({ searchTerm, setSearchTerm, filterType, setFilterType, sortOrder, setSortOrder, folders, folderFilter, setFolderFilter }) => {
    
    const handleClear = () => {
        setSearchTerm('');
        setFilterType('all');
        setFolderFilter('all');
        setSortOrder('date_desc');
    };

    return (
        <div className="flex flex-col md:flex-row gap-3 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cerca file per nome..." 
                    className="pl-9 bg-white dark:bg-slate-950" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="w-full md:w-[200px] bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Tutte le cartelle" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tutte le cartelle</SelectItem>
                    {folders.map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[150px] bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Tutti i tipi" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="images">Immagini</SelectItem>
                    <SelectItem value="pdfs">PDF</SelectItem>
                    <SelectItem value="documents">Documenti</SelectItem>
                    <SelectItem value="videos">Video</SelectItem>
                    <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="date_desc">Più recenti</SelectItem>
                    <SelectItem value="date_asc">Meno recenti</SelectItem>
                    <SelectItem value="size_desc">Più grandi</SelectItem>
                    <SelectItem value="size_asc">Più piccoli</SelectItem>
                    <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleClear} className="shrink-0" title="Resetta filtri">
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
};

export default CloudStorageFilters;
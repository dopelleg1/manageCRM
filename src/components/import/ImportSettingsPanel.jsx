import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Settings, History } from 'lucide-react';
import { clearAllMappings } from '@/services/mappingPersistenceService';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

const ImportSettingsPanel = () => {
    const { toast } = useToast();
    const [batchSize, setBatchSize] = useState(50);
    const [autoMapping, setAutoMapping] = useState(true);

    const handleClearMappings = () => {
        if(confirm("Sei sicuro di voler cancellare tutte le mappature salvate? Dovrai reimpostarle manualmente al prossimo import.")) {
            clearAllMappings();
            toast({ title: "Mappature Cancellate", description: "Tutte le configurazioni di importazione sono state resettate." });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" /> Impostazioni Importazione
                </CardTitle>
                <CardDescription>Gestisci come vengono importati i dati nel sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Mappatura Automatica</Label>
                        <p className="text-sm text-muted-foreground">
                           Ricorda le colonne mappate per import futuri.
                        </p>
                    </div>
                    <Switch checked={autoMapping} onCheckedChange={setAutoMapping} />
                </div>
                
                <Separator />

                <div className="space-y-2">
                    <Label>Dimensione Batch (Record per volta)</Label>
                    <div className="flex gap-4">
                        <Input 
                            type="number" 
                            value={batchSize} 
                            onChange={(e) => setBatchSize(parseInt(e.target.value))} 
                            min="10" 
                            max="500"
                            className="w-32"
                        />
                        <p className="text-sm text-muted-foreground self-center">
                            Consigliato: 50-100. Valori alti possono causare timeout.
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="pt-2">
                    <Button variant="destructive" variantOutline onClick={handleClearMappings} className="w-full sm:w-auto">
                        <Trash2 className="mr-2 h-4 w-4" /> Resetta Mappature Salvate
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
};

export default ImportSettingsPanel;
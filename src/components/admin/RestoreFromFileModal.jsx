import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

const RestoreFromFileModal = ({ isOpen, onClose }) => {
    const { toast } = useToast();
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleRestore = () => {
        if (!file) return;
        setIsUploading(true);
        toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" });
        setTimeout(() => {
            setIsUploading(false);
            onClose();
        }, 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ripristina da File</DialogTitle>
                    <DialogDescription>Carica un file ZIP di backup</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <Input type="file" accept=".zip" onChange={(e) => setFile(e.target.files[0])} />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isUploading}>Annulla</Button>
                    <Button onClick={handleRestore} disabled={isUploading || !file}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Ripristina
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RestoreFromFileModal;
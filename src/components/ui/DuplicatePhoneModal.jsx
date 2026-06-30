import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, User } from 'lucide-react';

const DuplicatePhoneModal = ({ isOpen, duplicateRecord, onConfirmUpdate, onCancel }) => {
  if (!duplicateRecord) return null;

  // Handle standard vs _proprietario field schemas
  const nome = duplicateRecord.nome || duplicateRecord.nome_proprietario || '';
  const cognome = duplicateRecord.cognome || duplicateRecord.cognome_proprietario || '';
  const telefono = duplicateRecord.telefono || duplicateRecord.telefono_proprietario || '';
  const email = duplicateRecord.email || duplicateRecord.email_proprietario || '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px] !z-[1600]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
             Numero di telefono duplicato
          </DialogTitle>
          <DialogDescription>
            Esiste già un record con questo numero di telefono nel database.
            Vuoi modificare il record esistente invece di crearne uno nuovo?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 bg-gray-50 dark:bg-gray-900 rounded-md p-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                    <p className="text-xs text-gray-500 uppercase">Nominativo</p>
                    <p className="font-medium">{nome} {cognome}</p>
                </div>
            </div>
            
            <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                    <p className="text-xs text-gray-500 uppercase">Telefono</p>
                    <p className="font-medium">{telefono}</p>
                </div>
            </div>

            {email && (
                <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Email</p>
                        <p className="text-sm">{email}</p>
                    </div>
                </div>
            )}

            {duplicateRecord.indirizzo && (
                <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Indirizzo</p>
                        <p className="text-sm">{duplicateRecord.indirizzo}</p>
                    </div>
                </div>
            )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button onClick={() => onConfirmUpdate(duplicateRecord.id)}>
            Aggiorna il record esistente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicatePhoneModal;
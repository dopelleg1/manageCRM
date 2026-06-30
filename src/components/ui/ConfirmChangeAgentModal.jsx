import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function ConfirmChangeAgentModal({ 
    isOpen, 
    onConfirm, 
    onCancel, 
    oldAgentName, 
    newAgentName 
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) onCancel();
    }}>
      <DialogContent className="sm:max-w-[425px] !z-[1600]">
        <DialogHeader>
          <DialogTitle>Conferma Cambio Agente</DialogTitle>
          <DialogDescription>
            Stai per assegnare questo record a un altro agente.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2 font-medium">
            ⚠️ Attenzione hai cambiato Agente e questo comporterà che il contatto non sarà più visibile a te ma all'agente che hai selezionato ({newAgentName}). Sei sicuro?
          </AlertDescription>
        </Alert>

        <DialogFooter className="sm:justify-between mt-4">
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
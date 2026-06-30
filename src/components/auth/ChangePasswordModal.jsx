import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { supabase } from '@/lib/customSupabaseClient';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFormDraftManager } from '@/hooks/useFormDraftManager';

const ChangePasswordModal = ({ isOpen, onClose, agent }) => {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    
    // Draft Manager (Note: Passwords are automatically excluded by manager security check)
    // We only use this to maintain non-sensitive state if any existed, but for this specific modal
    // everything is sensitive, so the manager will effectively do nothing, which is correct behavior.
    const DRAFT_KEY = `draft_change_pw_${agent?.id}`;
    const { draft, saveDraftField, clearDraft } = useFormDraftManager(DRAFT_KEY);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    
    const { isValid, strength, getStrengthLabel, getStrengthColor } = usePasswordValidation(newPassword);

    const handleClose = () => {
        setNewPassword('');
        setConfirmPassword('');
        setServerError(null);
        setIsSubmitting(false);
        clearDraft(); // Ensure clean slate
        onClose();
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setServerError(null);

        if (!isValid) {
            toast({
                title: "Password non valida",
                description: "La password non soddisfa i requisiti di sicurezza.",
                variant: "destructive"
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                title: "Le password non coincidono",
                description: "Assicurati che i due campi siano identici.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            console.log("Initiating password change via change-password function for:", agent.email);
            
            const { data, error } = await supabase.functions.invoke('change-password', {
                body: { 
                    email: agent.email, 
                    password: newPassword,
                    name: agent.name
                }
            });

            console.log("Edge Function Response:", data);

            if (error) {
                console.error("Invocation error:", error);
                throw { message: error.message || "Errore di connessione al server.", step: "Network Request" };
            }

            if (data && !data.success) {
                console.error("Logic error:", data);
                throw { message: data.details || data.error || "Errore sconosciuto durante l'aggiornamento.", step: "Edge Function Processing" };
            }

            if (currentUser && agent) {
                const { error: logError } = await supabase.from('password_change_log').insert({
                    user_id: agent.id,
                    changed_by_id: currentUser.id,
                    changed_at: new Date().toISOString(),
                    user_agent: navigator.userAgent
                });

                if (logError) {
                    console.warn("Failed to insert audit log:", logError);
                }
            }

            toast({
                title: "Password Aggiornata",
                description: "Password modificata con successo. L'utente può accedere immediatamente.",
                className: "bg-green-50 border-green-200 text-green-900",
            });

            handleClose();

        } catch (err) {
            console.error("Password change process failed:", err);
            
            setServerError({
                message: err.message || "Si è verificato un errore imprevisto.",
                step: err.step || "Processing"
            });

            toast({
                title: "Operazione Fallita",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!agent) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                        Cambio Password
                    </DialogTitle>
                    <DialogDescription>
                        Imposta una nuova password per <strong>{agent.name}</strong> ({agent.email}).
                    </DialogDescription>
                </DialogHeader>

                {serverError && (
                    <Alert variant="destructive" className="my-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Errore durante {serverError.step}</AlertTitle>
                        <AlertDescription>
                            {serverError.message}
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Nuova Password</Label>
                        <Input
                            id="new-password"
                            type="text" 
                            placeholder="Inserisci nuova password..."
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                setServerError(null); 
                            }}
                            disabled={isSubmitting}
                            className={!isValid && newPassword.length > 0 ? "border-red-300 focus-visible:ring-red-200" : ""}
                        />
                        
                        {newPassword && (
                            <div className="space-y-2 mt-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Sicurezza: <span className="font-medium text-gray-700">{getStrengthLabel()}</span></span>
                                    <span className="text-gray-400">{strength}/5</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-300 ${getStrengthColor()}`} 
                                        style={{ width: `${(strength / 5) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 p-3 rounded-md border border-slate-100 mt-2">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Requisiti minimi:</p>
                            <ul className="text-xs space-y-1">
                                <RequirementItem met={newPassword.length >= 8} text="Almeno 8 caratteri" />
                                <RequirementItem met={/[A-Z]/.test(newPassword)} text="Una lettera maiuscola" />
                                <RequirementItem met={/[a-z]/.test(newPassword)} text="Una lettera minuscola" />
                                <RequirementItem met={/[0-9]/.test(newPassword)} text="Un numero" />
                                <RequirementItem met={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)} text="Un carattere speciale (!@#...)" />
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Conferma Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            placeholder="Ripeti la password..."
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setServerError(null);
                            }}
                            disabled={isSubmitting}
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <AlertTriangle className="h-3 w-3" /> Le password non coincidono
                            </p>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            Annulla
                        </Button>
                        
                        {serverError ? (
                            <Button 
                                type="button" 
                                onClick={(e) => handleSubmit(e)} 
                                variant="destructive"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                                Riprova
                            </Button>
                        ) : (
                            <Button 
                                type="submit" 
                                disabled={!isValid || newPassword !== confirmPassword || isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                Salva Password
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const RequirementItem = ({ met, text }) => (
    <li className={`flex items-center gap-2 ${met ? 'text-green-600' : 'text-slate-400'}`}>
        {met ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-0.5 mr-1" />}
        <span className={met ? 'line-through opacity-70' : ''}>{text}</span>
    </li>
);

export default ChangePasswordModal;
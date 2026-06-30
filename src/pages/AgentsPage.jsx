import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { MoreHorizontal, Trash2, Loader2, PlusCircle, Shield, UserPlus, ArrowRightLeft, AlertTriangle, CheckCircle, XCircle, Bug, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import UserAuthDiagnostic from '@/components/debug/UserAuthDiagnostic';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal'; 
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { useFormDraftManager } from '@/hooks/useFormDraftManager';

const AgentsPage = () => {
    const { toast } = useToast();
    const { agents, loading, deleteRecord, fetchAllData } = useData();
    const { userRole, user: currentUser } = useAuth();
    
    // Draft Manager
    const DRAFT_KEY = `draft_agent_form_${currentUser?.id}`;
    const { draft, saveDraftObject, clearDraft } = useFormDraftManager(DRAFT_KEY);

    // Modals State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false); 
    
    // Delete & Reassign State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [heirAgentId, setHeirAgentId] = useState('');
    const [deleteError, setDeleteError] = useState(null);
    
    // Diagnostic State (Simple & Advanced)
    const [diagnosticEmail, setDiagnosticEmail] = useState('studiobp.beppe@gmail.com');
    const [diagnosticResult, setDiagnosticResult] = useState(null);
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    
    // Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'agente',
        color: '#3b82f6',
        password: ''
    });
    
    const [editingAgent, setEditingAgent] = useState(null);

    // Restore draft on modal open
    useEffect(() => {
        if (isAddModalOpen && draft) {
            setFormData(prev => ({
                ...prev,
                ...draft,
                password: '' // Never restore password
            }));
        }
    }, [isAddModalOpen, draft]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);
        
        // Only save to draft if Adding (not editing) and field is not password
        if (isAddModalOpen && name !== 'password') {
            saveDraftObject(newData);
        }
    };

    const handleRoleChange = (value) => {
        const newData = { ...formData, role: value };
        setFormData(newData);
        if (isAddModalOpen) {
             saveDraftObject(newData);
        }
    };

    const handleAddClick = () => {
        // Only clear if draft is empty or specific logic requires reset
        if (!draft) {
             setFormData({ name: '', email: '', role: 'agente', color: '#3b82f6', password: '' });
        }
        setIsAddModalOpen(true);
    };

    const handleEditClick = (agent) => {
        setEditingAgent(agent);
        setFormData({
            name: agent.name,
            email: agent.email,
            role: agent.role || 'agente',
            color: agent.color || '#3b82f6',
            password: ''
        });
        setIsEditModalOpen(true);
    };
    
    const handleChangePasswordClick = (agent) => {
        setEditingAgent(agent);
        setIsChangePasswordModalOpen(true);
    };

    const handlePrepareDelete = (agent) => {
        setRecordToDelete(agent);
        setHeirAgentId(''); 
        setDeleteError(null);
        setIsDeleteModalOpen(true);
    };

    const handleRunDiagnostic = async (e) => {
        e.preventDefault();
        setIsDiagnosing(true);
        setDiagnosticResult(null);

        try {
            const { data, error } = await supabase.functions.invoke('admin-get-user', {
                body: { email: diagnosticEmail }
            });

            if (error) throw new Error(error.message);
            if (!data.success && data.error) throw new Error(data.error);

            setDiagnosticResult(data);
        } catch (error) {
            console.error("Diagnostic error:", error);
            toast({ 
                title: "Errore Diagnostica", 
                description: error.message || "Impossibile contattare il server.", 
                variant: "destructive" 
            });
        } finally {
            setIsDiagnosing(false);
        }
    };

    const handleCreateAgent = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: existingAgent } = await supabase
                .from('agents')
                .select('id')
                .eq('email', formData.email)
                .maybeSingle();

            if (existingAgent) {
                throw new Error("Un agente con questa email esiste già nel sistema.");
            }

            const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
                body: {
                    email: formData.email,
                    password: formData.password, 
                    name: formData.name,
                    role: formData.role
                }
            });

            if (authError) {
                let errorMsg = authError.message;
                try {
                     const parsed = JSON.parse(authError.message);
                     if (parsed.error) errorMsg = parsed.error;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            
            if (authData?.error) throw new Error(authData.error);

            toast({ title: "Successo", description: "Agente creato con successo." });
            clearDraft();
            setFormData({ name: '', email: '', role: 'agente', color: '#3b82f6', password: '' });
            setIsAddModalOpen(false);
            await fetchAllData();

        } catch (error) {
            console.error("Error creating agent:", error);
            toast({ title: "Errore Creazione", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUpdateAgent = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const updates = {
                name: formData.name,
                role: formData.role,
                color: formData.color
            };

            const { error } = await supabase.from('agents').update(updates).eq('id', editingAgent.id);

            if (error) throw error;

            toast({ title: "Successo", description: "Profilo agente aggiornato." });
            setIsEditModalOpen(false);
            await fetchAllData();

        } catch (error) {
             toast({ title: "Errore", description: `Impossibile aggiornare: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteWithReassign = async () => {
        setDeleteError(null);
        if (!recordToDelete || !heirAgentId) {
            setDeleteError("Seleziona un agente a cui trasferire i record.");
            return;
        }
        setIsDeleting(true);
        try {
            const { data, error: funcError } = await supabase.functions.invoke('delete-and-reassign-agent', {
                body: { userId: recordToDelete.id, newOwnerId: heirAgentId }
            });

            if (funcError) throw new Error(funcError.message || "Errore di connessione al server.");
            if (data && data.error) throw new Error(data.error);

            toast({ title: "Agente Eliminato", description: "Record trasferiti correttamente." });
            deleteRecord('agents', recordToDelete.id);
            setIsDeleteModalOpen(false);
        } catch (error) {
            const msg = error.message || "Si è verificato un errore sconosciuto.";
            setDeleteError(msg);
            toast({ title: "Errore Eliminazione", description: msg, variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const availableHeirs = useMemo(() => {
        return agents.filter(a => recordToDelete && a.id !== recordToDelete.id);
    }, [agents, recordToDelete]);

    const columns = useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Nome',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: row.original.color || '#ccc' }}>
                        {row.original.name ? row.original.name.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <span className="font-medium">{row.original.name}</span>
                    {currentUser?.id === row.original.id && <Badge variant="outline" className="ml-2 border-blue-200 text-blue-600 bg-blue-50">Tu</Badge>}
                </div>
            )
        },
        { accessorKey: 'email', header: 'Email' },
        {
            accessorKey: 'role',
            header: 'Ruolo',
            cell: ({ row }) => {
                const role = row.original.role;
                let variant = "outline";
                if (role === 'admin') variant = "default";
                if (role === 'super_admin') variant = "destructive";
                if (role === 'telemarketing') variant = "secondary";
                return <Badge variant={variant}>{role}</Badge>;
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const isTargetSuperAdmin = row.original.role === 'super_admin';
                const isTargetAdmin = row.original.role === 'admin';
                const canEdit = userRole === 'admin' || userRole === 'super_admin'; 
                const canDelete = (userRole === 'super_admin') || (userRole === 'admin' && !isTargetSuperAdmin);
                const canChangePassword = userRole === 'super_admin' || (userRole === 'admin' && !isTargetAdmin && !isTargetSuperAdmin);
                const isSelf = currentUser?.id === row.original.id;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                            
                            {canEdit && (
                                <DropdownMenuItem onClick={() => handleEditClick(row.original)}>
                                    Modifica Profilo
                                </DropdownMenuItem>
                            )}
                            
                            {(canChangePassword || isSelf) && (
                                <DropdownMenuItem onClick={() => handleChangePasswordClick(row.original)}>
                                    <KeyRound className="h-4 w-4 mr-2 text-gray-500"/> Cambia Password
                                </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            {canDelete && !isSelf && (
                                <DropdownMenuItem onClick={() => handlePrepareDelete(row.original)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                    <Trash2 className="h-4 w-4 mr-2"/> Elimina Agente
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], [userRole, currentUser]);

    if (!['admin', 'super_admin'].includes(userRole)) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <Shield className="h-16 w-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-700">Accesso Negato</h2>
                <p className="text-gray-500">Non hai i permessi per visualizzare questa pagina.</p>
            </div>
        );
    }

    const handleCancelCreate = () => {
        clearDraft();
        setIsAddModalOpen(false);
    }

    return (
        <>
            <Helmet>
                <title>Gestione Agenti - CRM</title>
            </Helmet>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Team & Agenti</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">Gestisci gli utenti, i ruoli e gli accessi alla piattaforma.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsDiagnosticModalOpen(true)}>
                            <Bug className="h-4 w-4 mr-2" /> Diagnostica Utente
                        </Button>
                        <Button onClick={handleAddClick}>
                            <UserPlus className="h-4 w-4 mr-2" /> Nuovo Utente
                        </Button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    {loading ? <div className="flex justify-center h-32 items-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div> : 
                    <DataTable columns={columns} data={agents} filterPlaceholder="Cerca agente..." />}
                </div>
            </motion.div>

            <Dialog open={isDiagnosticModalOpen} onOpenChange={setIsDiagnosticModalOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Strumenti di Diagnostica</DialogTitle>
                        <DialogDescription>Verifica stato utenti, permessi e consistenza dati.</DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="simple">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="simple">Verifica Singola</TabsTrigger>
                            <TabsTrigger value="advanced">Comparazione (Deep Dive)</TabsTrigger>
                        </TabsList>

                        <TabsContent value="simple" className="space-y-4 py-4">
                            <form onSubmit={handleRunDiagnostic} className="flex gap-2">
                                <Input 
                                    placeholder="Email utente..." 
                                    value={diagnosticEmail} 
                                    onChange={(e) => setDiagnosticEmail(e.target.value)} 
                                />
                                <Button type="submit" disabled={isDiagnosing}>
                                    {isDiagnosing ? <Loader2 className="animate-spin h-4 w-4" /> : "Verifica"}
                                </Button>
                            </form>

                            {diagnosticResult && (
                                <div className="space-y-4 text-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={`p-4 rounded border ${diagnosticResult.foundInAuth ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                                {diagnosticResult.foundInAuth ? <CheckCircle className="h-4 w-4 text-green-600"/> : <XCircle className="h-4 w-4 text-red-600"/>}
                                                Account Login (Auth)
                                            </h4>
                                            {diagnosticResult.foundInAuth ? (
                                                <ul className="space-y-1 text-slate-700">
                                                    <li><strong>ID:</strong> {diagnosticResult.authData.id.substring(0,8)}...</li>
                                                    <li><strong>Creato:</strong> {format(new Date(diagnosticResult.authData.created_at), 'dd/MM/yyyy')}</li>
                                                    <li><strong>Ultimo Login:</strong> {diagnosticResult.authData.last_sign_in_at ? format(new Date(diagnosticResult.authData.last_sign_in_at), 'dd/MM/yyyy HH:mm') : 'Mai'}</li>
                                                </ul>
                                            ) : <p className="text-red-600">L'utente non esiste in Auth.</p>}
                                        </div>
                                        <div className={`p-4 rounded border ${diagnosticResult.foundInPublic ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                                {diagnosticResult.foundInPublic ? <CheckCircle className="h-4 w-4 text-green-600"/> : <XCircle className="h-4 w-4 text-red-600"/>}
                                                Profilo CRM (Public)
                                            </h4>
                                            {diagnosticResult.foundInPublic ? (
                                                <ul className="space-y-1 text-slate-700">
                                                    <li><strong>Nome:</strong> {diagnosticResult.publicData.name}</li>
                                                    <li><strong>Ruolo:</strong> {diagnosticResult.publicData.role}</li>
                                                </ul>
                                            ) : <p className="text-red-600">Profilo CRM mancante.</p>}
                                        </div>
                                    </div>
                                    {!diagnosticResult.isSynced && diagnosticResult.foundInAuth && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5"/>
                                            <div>
                                                <strong>Problema di Sincronizzazione:</strong>
                                                <p className="text-xs">L'utente esiste in Auth ma non nel CRM (o gli ID non coincidono). ID MISMATCH.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="advanced" className="py-4">
                            <UserAuthDiagnostic />
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddModalOpen} onOpenChange={(open) => !open && handleCancelCreate()}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
                        <DialogDescription>Crea un nuovo account. L'utente potrà accedere subito con la password impostata.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAgent} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input id="name" name="name" placeholder="Mario Rossi" value={formData.name} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="mario@esempio.it" value={formData.email} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password Provvisoria</Label>
                            <Input id="password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required minLength={6} />
                            <p className="text-xs text-gray-500">L'utente potrà cambiare questa password al primo accesso.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Ruolo</Label>
                                <Select value={formData.role} onValueChange={handleRoleChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="agente">Agente</SelectItem>
                                        <SelectItem value="telemarketing">Telemarketing</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        {userRole === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="color">Colore Label</Label>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded border shadow-sm" style={{ backgroundColor: formData.color }}></div>
                                    <Input id="color" name="color" type="color" className="w-full h-8 p-0 border-0" value={formData.color} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={handleCancelCreate}>Annulla</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />} Crea Utente</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Modifica Profilo</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateAgent} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome Completo</Label>
                            <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Email (Non modificabile)</Label>
                            <Input value={formData.email} disabled className="bg-gray-100" />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-role">Ruolo</Label>
                                <Select value={formData.role} onValueChange={handleRoleChange}>
                                    <SelectTrigger> <SelectValue /> </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="agente">Agente</SelectItem>
                                        <SelectItem value="telemarketing">Telemarketing</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        {userRole === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="edit-color">Colore</Label>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: formData.color }}></div>
                                    <Input id="edit-color" name="color" type="color" className="flex-1 h-8 p-0" value={formData.color} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Annulla</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Salva Modifiche"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            <ChangePasswordModal 
                isOpen={isChangePasswordModalOpen} 
                onClose={() => setIsChangePasswordModalOpen(false)} 
                agent={editingAgent} 
            />

            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Eliminazione Agente
                        </DialogTitle>
                        <DialogDescription>
                            Stai per eliminare l'agente <strong>{recordToDelete?.name}</strong>. 
                            Questa azione è irreversibile.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {deleteError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
                            <span className="block font-bold mb-1">Errore:</span>
                            <span className="block sm:inline">{deleteError}</span>
                        </div>
                    )}

                    <div className="py-4 space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                            <p className="font-semibold mb-1">⚠️ Trasferimento Dati Richiesto</p>
                            <p>Per mantenere l'integrità del database, devi assegnare tutti i record (Attività, Immobili, Appuntamenti) di questo agente a un altro collega.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="heir-select">Assegna tutti i record a:</Label>
                            <Select value={heirAgentId} onValueChange={setHeirAgentId}>
                                <SelectTrigger id="heir-select" className="w-full">
                                    <SelectValue placeholder="Seleziona un erede..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableHeirs.map(agent => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                            {agent.name} ({agent.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Annulla</Button>
                        <Button 
                            onClick={handleDeleteWithReassign} 
                            disabled={!heirAgentId || isDeleting} 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                            Trasferisci & Elimina
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AgentsPage;
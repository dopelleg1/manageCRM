import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Shield, DatabaseZap } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import AnalysisReport from '@/components/admin/AnalysisReport';
import ImportAnalysisTool from '@/components/debug/ImportAnalysisTool';
import BackupManagementModal from '@/components/admin/BackupManagementModal';
import DatabaseAnalysisPanel from '@/components/admin/DatabaseAnalysisPanel';

const SuperAdminPanel = () => {
  const { toast } = useToast();
  const { agents, fetchAllData } = useData();
  const { userRole } = useAuth();
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setUsers(agents);
  }, [agents]);

  const handleRoleChange = async (userId, newRole) => {
    const targetUser = users.find(u => u.id === userId);
    
    if (targetUser?.role === 'super_admin' && userRole !== 'super_admin') {
        toast({ 
            title: "Azione Negata", 
            description: "Non puoi modificare un Super Admin.", 
            variant: "destructive" 
        });
        setUsers([...users]); 
        return;
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

    const { error } = await supabase
      .from('agents')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare il ruolo.", variant: "destructive" });
      fetchAllData(); 
    } else {
      toast({ title: "Successo", description: "Ruolo utente aggiornato.", className: "bg-green-500 text-white" });
      fetchAllData(); 
    }
  };

  return (
    <>
      <Helmet>
        <title>Super Admin Panel - CRM</title>
      </Helmet>
      
      <div className="container mx-auto py-10 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-6 rounded-xl shadow-lg gap-4">
          <div className="flex items-center space-x-4">
            <Shield className="h-12 w-12 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold">Super Admin Control Center</h1>
              <p className="text-slate-400">Gestione avanzata del sistema, backup e migrazione.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/diagnostics')} variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold gap-2">
            <DatabaseZap className="h-4 w-4" />
            Diagnostica e Costi DB
          </Button>
        </div>

        <Tabs defaultValue="backups" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-2 h-auto">
            <TabsTrigger value="backups" className="py-2">Gestione Backup</TabsTrigger>
            <TabsTrigger value="system_analysis" className="py-2">Analisi Sistema</TabsTrigger>
            <TabsTrigger value="analysis" className="py-2">Analisi Telemarketing</TabsTrigger>
            <TabsTrigger value="debug" className="py-2">Debug Import</TabsTrigger>
            <TabsTrigger value="users" className="py-2">Gestione Utenti</TabsTrigger>
          </TabsList>

          <TabsContent value="backups" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestione Backup Avanzata</CardTitle>
                    <CardDescription>Crea, ripristina e gestisci i backup del sistema</CardDescription>
                </CardHeader>
                <CardContent>
                    <BackupManagementModal />
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system_analysis" className="mt-6">
             <DatabaseAnalysisPanel />
          </TabsContent>

          <TabsContent value="analysis" className="mt-6 space-y-6">
            <AnalysisReport />
          </TabsContent>

          <TabsContent value="debug" className="mt-6">
             <ImportAnalysisTool />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestione Ruoli e Permessi</CardTitle>
                    <CardDescription>Assegna ruoli di Admin o Super Admin agli utenti.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Ruolo Attuale</TableHead>
                                <TableHead>Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => {
                                const isTargetSuperAdmin = user.role === 'super_admin';
                                const canModify = userRole === 'super_admin' || !isTargetSuperAdmin;

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                user.role === 'super_admin' ? 'default' : 
                                                user.role === 'admin' ? 'secondary' : 'outline'
                                            } className={user.role === 'super_admin' ? 'bg-purple-600' : ''}>
                                                {user.role || 'user'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Select 
                                                disabled={!canModify}
                                                defaultValue={user.role || 'user'} 
                                                onValueChange={(val) => handleRoleChange(user.id, val)}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Seleziona Ruolo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User / Agente</SelectItem>
                                                    <SelectItem value="telemarketing">Telemarketing</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default SuperAdminPanel;
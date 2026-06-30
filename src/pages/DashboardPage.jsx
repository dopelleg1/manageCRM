import React, { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { isToday, isAfter, subDays, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RingLoader } from 'react-spinners';
import { 
  CalendarCheck, AlertTriangle, Sparkles, User, Clock, 
  Activity, Home, Phone, Users, Building, Key, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const DashboardPage = () => {
  const { user, userRole } = useAuth();
  const { 
    agents, 
    appointments, 
    properties, 
    activities, 
    potentialTobacconists, 
    potentialActivities, 
    telemarketing,
    loading 
  } = useData();

  const [recentLogins, setRecentLogins] = useState([]);

  // Constants for role checks to ensure consistency
  const isAdminOrSuper = ['admin', 'super_admin'].includes(userRole);
  const canViewStandardWidgets = ['admin', 'super_admin', 'agente'].includes(userRole);

  // --- Super Admin: Fetch Last Logins ---
  useEffect(() => {
    if (userRole === 'super_admin' && agents.length > 0) {
      const fetchLogins = async () => {
        const agentIds = agents.map(a => a.id);
        const { data, error } = await supabase.rpc('get_users_last_sign_in', { p_user_ids: agentIds });
        
        if (data && !error) {
          const merged = data
            .map(login => {
              const agent = agents.find(a => a.id === login.id);
              return { 
                ...login, 
                name: agent?.name || 'Unknown', 
                email: agent?.email || 'Unknown' 
              };
            })
            .filter(l => l.last_sign_in_at) // Filter out never logged in
            .sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at))
            .slice(0, 3);
          setRecentLogins(merged);
        }
      };
      fetchLogins();
    }
  }, [userRole, agents]);

  const currentUserAgent = useMemo(() => agents.find(agent => agent.id === user?.id), [agents, user]);

  const agentMap = useMemo(() => {
    return agents.reduce((acc, agent) => {
      acc[agent.id] = agent.name;
      return acc;
    }, {});
  }, [agents]);

  const today = new Date();
  const yesterday = subDays(today, 1);

  // --- Standard Dashboard Data (Admin/User/Telemarketing) ---
  const dashboardData = useMemo(() => {
    if (loading) return null;

    // Filter data based on role
    // Super Admin and Admin see ALL data
    const userAppointments = isAdminOrSuper ? appointments : appointments.filter(a => a.agente_id === user.id);
    const userProperties = isAdminOrSuper ? properties : properties.filter(p => p.agente_id === user.id);
    const userActivities = isAdminOrSuper ? activities : activities.filter(a => a.agente_id === user.id);
    const userPotTobacconists = isAdminOrSuper ? potentialTobacconists : potentialTobacconists.filter(pt => pt.agente_id === user.id);
    const userPotActivities = isAdminOrSuper ? potentialActivities : potentialActivities.filter(pa => pa.agente_id === user.id);
    const userTelemarketing = isAdminOrSuper ? telemarketing : telemarketing.filter(tm => tm.agente_id === user.id);
    
    // 1. Today's Appointments
    const todaysAppointments = userAppointments
      .filter(a => isToday(parseISO(a.start_time)))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // For Telemarketing: today's callbacks
    const todaysTelemarketingCallbacks = telemarketing
      .filter(tm => tm.data_ultimo_richiamo && isToday(parseISO(tm.data_ultimo_richiamo)))
      .filter(tm => isAdminOrSuper || (userRole === 'telemarketing' && (tm.agente_id === user.id || !tm.agente_id)));

    // 2. Expiring Mandates & Showcases
    const expiringMandates = [
      ...userProperties.filter(p => p.scadenza_mandato && isToday(parseISO(p.scadenza_mandato))).map(p => ({...p, type: 'Mandato Immobile'})),
      ...userActivities.filter(a => a.scadenza_mandato && isToday(parseISO(a.scadenza_mandato))).map(a => ({...a, type: 'Mandato Attività'})),
    ];
    const expiringShowcases = userActivities.filter(a => a.vetrina && isToday(parseISO(a.vetrina))).map(a => ({...a, type: 'Vetrina'}));
    const allExpirations = [...expiringMandates, ...expiringShowcases];

    // 3. New Records since yesterday
    const newRecords = [
      ...userProperties.filter(p => isAfter(parseISO(p.created_at), yesterday)).map(p => ({...p, type: 'Immobile'})),
      ...userActivities.filter(a => isAfter(parseISO(a.created_at), yesterday)).map(a => ({...a, type: 'Attività'})),
      ...userPotTobacconists.filter(pt => isAfter(parseISO(pt.created_at), yesterday)).map(pt => ({...pt, type: 'Pot. Tabaccheria'})),
      ...userPotActivities.filter(pa => isAfter(parseISO(pa.created_at), yesterday)).map(pa => ({...pa, type: 'Pot. Attività'})),
      ...userTelemarketing.filter(tm => isAfter(parseISO(tm.created_at), yesterday)).map(tm => ({...tm, type: 'Contatto TMK'})),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { todaysAppointments, allExpirations, newRecords, todaysTelemarketingCallbacks };
  }, [user, userRole, loading, appointments, properties, activities, potentialTobacconists, potentialActivities, telemarketing, agentMap, isAdminOrSuper, yesterday]);

  const getRecordIdentifier = (record) => {
    return record.codice ? `${record.codice}-${record.numero}` : 
           record.numero_rivendita ? `Riv. ${record.numero_rivendita}` :
           record.nome_azienda || `${record.nome || ''} ${record.cognome || ''}`.trim() || `ID: ${record.id.substring(0, 4)}`;
  }

  const getLastRecords = (dataList, count = 3) => {
    return [...dataList]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, count);
  };

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <RingLoader color={"#36d7b7"} loading={true} size={100} />
      </div>
    );
  }

  const { todaysAppointments, allExpirations, newRecords, todaysTelemarketingCallbacks } = dashboardData;

  return (
    <>
      <Helmet>
        <title>Dashboard - StudioBP Management</title>
        <meta name="description" content="Dashboard principale di StudioBP Management" />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    Benvenuto, {currentUserAgent?.name || user?.email}!
                    {userRole === 'super_admin' && <Badge className="bg-purple-600 text-white"><ShieldAlert className="h-3 w-3 mr-1"/> Super Admin</Badge>}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">Ecco la tua panoramica di oggi, {format(today, 'eeee d MMMM yyyy', { locale: it })}.</p>
            </div>
            
            {/* Super Admin Quick Stat Badges */}
            {userRole === 'super_admin' && (
                <div className="flex gap-3">
                   <Card className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-l-4 border-blue-500 shadow-sm">
                      <div className="text-xs text-slate-500">Agenti Totali</div>
                      <div className="font-bold text-xl">{agents.length}</div>
                   </Card>
                   <Card className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-l-4 border-green-500 shadow-sm">
                      <div className="text-xs text-slate-500">Record Totali</div>
                      <div className="font-bold text-xl">
                        {properties.length + activities.length + telemarketing.length + potentialTobacconists.length + potentialActivities.length}
                      </div>
                   </Card>
                </div>
            )}
        </div>

        {/* --- SUPER ADMIN EXCLUSIVE SECTION --- */}
        {userRole === 'super_admin' && (
            <div className="bg-slate-100 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6">
                <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                    <Activity className="h-6 w-6 text-purple-600"/>
                    Activity Monitor (Super Admin)
                </div>

                {/* Logins Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 border-purple-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Key className="h-4 w-4 text-purple-500"/> Ultimi 3 Accessi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentLogins.length > 0 ? recentLogins.map(login => (
                                    <div key={login.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                                        <div className="bg-purple-100 p-2 rounded-full">
                                            <User className="h-4 w-4 text-purple-600"/>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm">{login.name}</div>
                                            <div className="text-xs text-slate-500">{login.email}</div>
                                            <div className="text-xs font-mono text-slate-400 mt-1">
                                                {format(parseISO(login.last_sign_in_at), 'dd/MM/yy HH:mm')}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-sm text-slate-500 italic">Nessun accesso recente registrato.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Modifications Grid */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Helper for small tables */}
                        {[
                            { title: 'Immobili', icon: Home, data: properties, color: 'text-blue-500' },
                            { title: 'Attività', icon: Building, data: activities, color: 'text-orange-500' },
                            { title: 'Telemarketing', icon: Phone, data: telemarketing, color: 'text-green-500' },
                            { title: 'Potenziali', icon: Users, data: [...potentialActivities, ...potentialTobacconists], color: 'text-pink-500' },
                        ].map((section, idx) => {
                            const last3 = getLastRecords(section.data);
                            return (
                                <Card key={idx} className="shadow-sm">
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <section.icon className={`h-4 w-4 ${section.color}`}/> 
                                            {section.title} - Ultimi Modificati
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-3">
                                        {last3.length > 0 ? (
                                            <div className="space-y-2">
                                                {last3.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center text-xs border-b border-dashed pb-1 last:border-0">
                                                        <span className="truncate max-w-[120px] font-medium" title={getRecordIdentifier(item)}>
                                                            {getRecordIdentifier(item)}
                                                        </span>
                                                        <div className="text-right">
                                                            <div className="text-slate-500">{agentMap[item.agente_id] || 'N/A'}</div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {format(parseISO(item.created_at), 'dd/MM HH:mm')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <span className="text-xs text-slate-400">Nessun dato.</span>}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          
          {/* Appointments Section - Admin, SuperAdmin & Agent */}
          {canViewStandardWidgets && (
            <Card className="xl:col-span-2 shadow-md border-t-4 border-t-blue-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center"><CalendarCheck className="mr-3 h-6 w-6 text-blue-500" />Appuntamenti di Oggi</CardTitle>
                <Badge variant="secondary">{todaysAppointments.length}</Badge>
              </CardHeader>
              <CardContent>
                {todaysAppointments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Ora</TableHead>
                        {isAdminOrSuper && <TableHead>Agente</TableHead>}
                        <TableHead>Dettagli</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaysAppointments.map(app => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{format(parseISO(app.start_time), 'HH:mm')}</TableCell>
                          {isAdminOrSuper && <TableCell>{agentMap[app.agente_id] || 'N/A'}</TableCell>}
                          <TableCell>{app.title}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Nessun appuntamento per oggi.</p>}
              </CardContent>
            </Card>
          )}

          {/* Telemarketing Callbacks - Telemarketing ONLY */}
          {(userRole === 'telemarketing') && (
             <Card className="xl:col-span-2 shadow-md border-t-4 border-t-orange-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center"><Clock className="mr-3 h-6 w-6 text-orange-500" />Richiami Telemarketing di Oggi</CardTitle>
                <Badge variant="secondary">{todaysTelemarketingCallbacks.length}</Badge>
              </CardHeader>
              <CardContent>
                {todaysTelemarketingCallbacks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contatto</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaysTelemarketingCallbacks.map(tm => (
                        <TableRow key={tm.id}>
                          <TableCell className="font-medium">{tm.nome_azienda || `${tm.nome} ${tm.cognome}`}</TableCell>
                          <TableCell className="truncate max-w-xs">{tm.note}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Nessun richiamo programmato per oggi.</p>}
              </CardContent>
            </Card>
          )}

          {/* Expirations Section - Admin, SuperAdmin & Agent */}
          {canViewStandardWidgets && (
            <Card className="shadow-md border-t-4 border-t-red-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center"><AlertTriangle className="mr-3 h-6 w-6 text-red-500" />Scadenze del Giorno</CardTitle>
                 <Badge variant="destructive">{allExpirations.length}</Badge>
              </CardHeader>
              <CardContent>
                {allExpirations.length > 0 ? (
                  <div className="space-y-3">
                    {allExpirations.map(exp => (
                      <div key={exp.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                        <div>
                          <p className="font-semibold">{getRecordIdentifier(exp)}</p>
                          <p className="text-xs text-gray-500">{agentMap[exp.agente_id] || 'N/A'}</p>
                        </div>
                        <Badge variant={exp.type === 'Vetrina' ? 'warning' : 'destructive'} className="text-[10px]">{exp.type}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Nessuna scadenza per oggi.</p>}
              </CardContent>
            </Card>
          )}

          {/* New Records Section - Everyone */}
          <Card className="xl:col-span-3 shadow-md border-t-4 border-t-green-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center"><Sparkles className="mr-3 h-6 w-6 text-green-500" />Nuovi Record Recenti</CardTitle>
              <Badge variant="default">{newRecords.length}</Badge>
            </CardHeader>
            <CardContent>
              {newRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Identificativo</TableHead>
                      {isAdminOrSuper && <TableHead>Agente</TableHead>}
                      <TableHead className="text-right">Data Creazione</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newRecords.map(rec => (
                      <TableRow key={rec.id}>
                        <TableCell><Badge variant="outline">{rec.type}</Badge></TableCell>
                        <TableCell className="font-medium">{getRecordIdentifier(rec)}</TableCell>
                        {isAdminOrSuper && <TableCell>{agentMap[rec.agente_id] || 'N/A'}</TableCell>}
                        <TableCell className="text-right text-xs">{format(parseISO(rec.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Nessun nuovo record da ieri.</p>}
            </CardContent>
          </Card>

        </div>
      </motion.div>
    </>
  );
};

export default DashboardPage;
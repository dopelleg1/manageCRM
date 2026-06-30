import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import DashboardPage from '@/pages/DashboardPage';
import CalendarPage from '@/pages/CalendarPage';
import MapPage from '@/pages/MapPage';
import ActivitiesPage from '@/pages/ActivitiesPage';
import CommercialActivitiesPage from '@/pages/CommercialActivitiesPage';
import PropertiesPage from '@/pages/PropertiesPage';
import PotentialTobacconistsPage from '@/pages/PotentialTobacconistsPage';
import PotentialActivitiesPage from '@/pages/PotentialActivitiesPage';
import TelemarketingPage from '@/pages/TelemarketingPage';
import AgentsPage from '@/pages/AgentsPage';
import ConfigurationPage from '@/pages/ConfigurationPage';
import SuperAdminPanel from '@/pages/SuperAdminPanel';
import DatabaseDiagnosticsPage from '@/pages/DatabaseDiagnosticsPage';
import MigrationControlPanel from '@/pages/MigrationControlPanel';
import MigrationSetupPage from '@/pages/MigrationSetupPage';
import BackupRestorePage from '@/pages/BackupRestorePage';
import LoginPage from '@/pages/LoginPage';
import SuperAdminToolbar from '@/components/admin/SuperAdminToolbar';
import { Toaster } from "@/components/ui/toaster";
import { HelmetProvider } from 'react-helmet-async';
import { useAuth, AuthProvider } from '@/contexts/SupabaseAuthContext';
import { RingLoader } from 'react-spinners';
import { DataProvider } from '@/contexts/DataContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { supabase } from '@/lib/customSupabaseClient';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const DevConnectionIndicator = () => {
  const [status, setStatus] = useState('Checking...');
  const [url, setUrl] = useState('');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log("Connected to Supabase Instance:", supabase.supabaseUrl);
        setUrl(supabase.supabaseUrl);
        const { error } = await supabase.from('agents').select('id').limit(1);
        setStatus(error ? 'Error' : 'Connected');
      } catch (err) {
        setStatus('Disconnected');
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="fixed bottom-0 right-0 p-2 text-xs bg-gray-900 text-white z-50 rounded-tl-md opacity-80 flex gap-2">
      <span>DB: {status}</span>
      <span className="text-gray-400">|</span>
      <span>{url.replace('https://', '')}</span>
    </div>
  );
};

const AuthRedirector = () => {
    const { session, loading, isPasswordRecovery } = useAuth();
    
    if (loading) {
        return (
             <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <RingLoader color={"#36d7b7"} loading={loading} size={150} />
            </div>
        );
    }

    if (isPasswordRecovery || 
        (window.location.hash && (window.location.hash.includes('type=recovery') || window.location.hash.includes('type=invite')))) {
        return <Navigate to="/update-password" replace />;
    }

    return session ? <Navigate to="/dashboard" replace /> : <LoginPage />;
};

const ProtectedLayout = () => {
    const { userRole } = useAuth();
    return (
        <Layout>
            {userRole === 'super_admin' && <SuperAdminToolbar />}
            <Outlet />
        </Layout>
    );
};

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <DataProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/update-password" element={<LoginPage />} />
                <Route path="/" element={<AuthRedirector />} />
                
                <Route element={<ProtectedRoute><ProtectedLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/map" element={<MapPage />} />
                </Route>
                
                 <Route element={<ProtectedRoute allowedRoles={['admin', 'agente', 'telemarketing', 'super_admin']}><ProtectedLayout /></ProtectedRoute>}>
                  <Route path="/activities" element={<CommercialActivitiesPage />} />
                  <Route path="/commercial-activities" element={<CommercialActivitiesPage />} />
                  <Route path="/properties" element={<PropertiesPage />} />
                  <Route path="/potential-tobacconists" element={<PotentialTobacconistsPage />} />
                  <Route path="/potential-activities" element={<PotentialActivitiesPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'telemarketing', 'super_admin']}><ProtectedLayout /></ProtectedRoute>}>
                   <Route path="/telemarketing" element={<TelemarketingPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><ProtectedLayout /></ProtectedRoute>}>
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/configuration" element={<ConfigurationPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['super_admin']}><ProtectedLayout /></ProtectedRoute>}>
                  <Route path="/super-admin" element={<SuperAdminPanel />} />
                  <Route path="/diagnostics" element={<DatabaseDiagnosticsPage />} />
                  <Route path="/migration-control" element={<MigrationControlPanel />} />
                  <Route path="/migration-setup" element={<MigrationSetupPage />} />
                  <Route path="/backup-restore" element={<BackupRestorePage />} />
                </Route>

              </Routes>
            </Router>
            <DevConnectionIndicator />
            <Toaster />
          </DataProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
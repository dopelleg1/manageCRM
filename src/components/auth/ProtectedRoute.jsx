import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { RingLoader } from 'react-spinners';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { session, loading, userRole, isPasswordRecovery } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <RingLoader color={"#36d7b7"} loading={loading} size={150} />
            </div>
        );
    }

    if (isPasswordRecovery) {
        return <Navigate to="/update-password" replace />;
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        if (allowedRoles.includes('super_admin')) {
            return (
                <div className="flex items-center justify-center h-screen p-4 bg-gray-50 dark:bg-gray-900">
                    <Alert variant="destructive" className="max-w-md">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Accesso negato</AlertTitle>
                        <AlertDescription>
                            Solo super admin possono accedere a questa pagina. Sarai reindirizzato alla dashboard.
                        </AlertDescription>
                        <button 
                            className="mt-4 text-sm underline"
                            onClick={() => window.location.href = '/dashboard'}
                        >
                            Torna alla Home
                        </button>
                    </Alert>
                </div>
            );
        }
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
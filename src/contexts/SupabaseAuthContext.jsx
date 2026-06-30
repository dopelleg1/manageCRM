import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchUserRole = useCallback(async (userId) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('agents')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
    return data?.role;
  }, []);

  const handleAuthStateChange = useCallback(async (event, session) => {
    // Detect recovery or invite flow
    if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
      // USER_UPDATED often fires after password change, but we care about the initial entry
    }

    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
        const role = await fetchUserRole(currentUser.id);
        setUserRole(role);
    } else {
      setUserRole(null);
    }
    setLoading(false);
  }, [fetchUserRole]);

  useEffect(() => {
    setLoading(true);
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // CRITICAL: Check URL hash for recovery or invite type BEFORE session is fully processed
      // This ensures we catch the user entering via email link
      const hash = window.location.hash;
      if (hash && (hash.includes('type=recovery') || hash.includes('type=invite'))) {
        setIsPasswordRecovery(true);
      }

      await handleAuthStateChange('INITIAL_SESSION', session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
        }
        handleAuthStateChange(event, session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleAuthStateChange]);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { data, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    // Reset recovery state on manual sign in attempt
    setIsPasswordRecovery(false); 
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  }, []);

  // Updated signOut handler to gracefully handle JWT/Session errors
  const signOut = useCallback(async () => {
    let returnError = null;
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            // Log the specific error for debugging purposes
            console.warn("Supabase signOut returned error:", error);
            
            // Check if the error is benign (session already invalid)
            const isBenignError = 
                error.message?.includes("session_id claim") || 
                error.message?.includes("JWT") || 
                error.status === 401 || 
                error.status === 403;

            // Only show toast if it's NOT a benign session error
            if (!isBenignError) {
                toast({
                    variant: "destructive",
                    title: "Logout completato con avviso",
                    description: "Disconnessione locale forzata. " + (error.message || ""),
                });
                returnError = error;
            } else {
                console.log("Ignored benign logout error (session likely expired already).");
            }
        }
    } catch (err) {
        console.error("Unexpected exception during logout:", err);
        returnError = err;
    } finally {
        // CRITICAL: Always clean up local state regardless of server response
        // This ensures the user is effectively logged out on the client side
        setUser(null);
        setSession(null);
        setUserRole(null);
        setIsPasswordRecovery(false);
        
        // Safety measure: Try to clear Supabase-specific keys from localStorage
        // This prevents 'zombie' sessions if the client SDK state got out of sync
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn("Could not clear localStorage keys:", e);
        }
    }

    return { error: returnError };
  }, [toast]);

  const clearRecoveryState = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const resendConfirmationEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
    });
    
    if (error) {
         toast({
            variant: "destructive",
            title: "Errore invio email",
            description: error.message,
         });
    } else {
         toast({
            title: "Email inviata",
            description: "Controlla la tua casella di posta per il link di conferma.",
         });
    }
    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    userRole,
    isPasswordRecovery,
    signUp,
    signIn,
    signOut,
    clearRecoveryState,
    resendConfirmationEmail,
  }), [user, session, loading, userRole, isPasswordRecovery, signUp, signIn, signOut, clearRecoveryState, resendConfirmationEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
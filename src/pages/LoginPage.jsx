import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet-async';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Modes: 'login', 'forgot_password', 'update_password'
  const [mode, setMode] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  
  const { signIn, clearRecoveryState, isPasswordRecovery, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  useEffect(() => {
    // Determine mode based on path or context
    if (location.pathname === '/update-password' || isPasswordRecovery) {
      setMode('update_password');
    } else {
      setMode('login');
    }
  }, [location.pathname, isPasswordRecovery]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setShowResend(false);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        // Check specifically for email not confirmed error
        if (error.message.includes("Email not confirmed")) {
            setShowResend(true);
            throw new Error("Email non confermata. Per favore conferma la tua email prima di accedere.");
        }
        throw error;
      }
      
      toast({
        title: "Benvenuto!",
        description: "Login effettuato con successo.",
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore Login",
        description: error.message || "Credenziali non valide.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;
    setIsLoading(true);
    await resendConfirmationEmail(email);
    setIsLoading(false);
    setShowResend(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      
      if (error) throw error;

      toast({
        title: "Email Inviata",
        description: "Controlla la tua casella di posta per il link di reset.",
        className: "bg-green-50 border-green-200 text-green-800"
      });
      
      // Optional: Switch back to login or show a success state
      setMode('login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Errore Password",
        description: "Le password non coincidono.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;

      toast({
        title: "Password Aggiornata",
        description: "La tua password è stata cambiata con successo. Verrai reindirizzato alla dashboard.",
        className: "bg-green-50 border-green-200 text-green-800"
      });
      
      // Clear recovery state and redirect
      clearRecoveryState();
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore Aggiornamento",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <Helmet>
        <title>
            {mode === 'login' ? 'Login' : 
             mode === 'forgot_password' ? 'Recupero Password' : 
             'Imposta Nuova Password'} - CRM
        </title>
      </Helmet>

      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {mode === 'login' && "Accedi al CRM"}
            {mode === 'forgot_password' && "Recupera Password"}
            {mode === 'update_password' && "Imposta Nuova Password"}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === 'login' && "Inserisci le tue credenziali per accedere"}
            {mode === 'forgot_password' && "Inserisci la tua email per ricevere il link di reset"}
            {mode === 'update_password' && "Scegli una nuova password sicura per il tuo account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="email" type="email" placeholder="nome@azienda.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button variant="link" className="p-0 h-auto text-xs" type="button" onClick={() => setMode('forgot_password')}>
                    Password dimenticata?
                  </Button>
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="password" type="password" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
              
              {showResend && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-yellow-800 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Account non confermato.</span>
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100" 
                        onClick={handleResendEmail}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Invia nuova email di conferma"}
                    </Button>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Accedi"}
              </Button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                 <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="reset-email" type="email" placeholder="nome@azienda.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Invia Link Reset"}
              </Button>
              <Button variant="ghost" className="w-full" type="button" onClick={() => setMode('login')}>
                Torna al Login
              </Button>
            </form>
          )}

          {/* UPDATE PASSWORD FORM */}
          {mode === 'update_password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
               <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md flex items-start gap-3 border border-blue-100 dark:border-blue-800 mb-4">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        È necessario aggiornare la tua password per continuare.
                    </p>
               </div>
               
              <div className="space-y-2">
                <Label htmlFor="new-password">Nuova Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="new-password" type="password" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Conferma Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="confirm-password" type="password" className="pl-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Imposta Password e Accedi"}
              </Button>
               <Button variant="ghost" className="w-full" type="button" onClick={() => {
                   clearRecoveryState();
                   setMode('login');
                   navigate('/login');
               }}>
                Annulla e Torna al Login
              </Button>
            </form>
          )}

        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4 text-xs text-slate-400">
          &copy; 2025 CRM Agency System
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
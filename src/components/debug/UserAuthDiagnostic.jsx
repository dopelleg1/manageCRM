import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const UserAuthDiagnostic = () => {
    const [email1, setEmail1] = useState('studiobp.beppe@gmail.com');
    const [email2, setEmail2] = useState('studiobp.roberto@gmail.com');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const runComparison = async () => {
        setLoading(true);
        setResults(null);
        try {
            // Fetch public agent data
            const { data: publicAgents } = await supabase
                .from('agents')
                .select('*')
                .in('email', [email1, email2]);

            // Fetch private auth data via Edge Function (reusing admin-get-user)
            const fetchAuthData = async (email) => {
                const { data, error } = await supabase.functions.invoke('admin-get-user', {
                    body: { email }
                });
                if (error) return { error: error.message };
                return data;
            };

            const auth1 = await fetchAuthData(email1);
            const auth2 = await fetchAuthData(email2);

            setResults({
                user1: {
                    email: email1,
                    public: publicAgents?.find(a => a.email === email1),
                    auth: auth1
                },
                user2: {
                    email: email2,
                    public: publicAgents?.find(a => a.email === email2),
                    auth: auth2
                }
            });

        } catch (error) {
            console.error("Diagnostic failed", error);
        } finally {
            setLoading(false);
        }
    };

    const renderStatus = (userResult) => {
        if (!userResult.auth?.success) return <span className="text-red-500 font-bold">MISSING IN AUTH</span>;
        if (!userResult.public) return <span className="text-red-500 font-bold">MISSING IN PUBLIC DB</span>;
        
        // ID Mismatch Check
        const authId = userResult.auth.authData.id;
        const publicId = userResult.public.id;
        
        if (authId !== publicId) {
            return (
                <div className="bg-red-50 border border-red-200 p-2 rounded text-red-700 text-xs mt-1">
                    <div className="font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> ID MISMATCH</div>
                    <div>Auth: {authId}</div>
                    <div>Public: {publicId}</div>
                </div>
            );
        }

        return <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle className="h-4 w-4"/> SYNCED OK</span>;
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg">Strumento Comparazione Utenti (Diagnostica)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input value={email1} onChange={e => setEmail1(e.target.value)} placeholder="Email Funzionante" />
                    <Input value={email2} onChange={e => setEmail2(e.target.value)} placeholder="Email Problematica" />
                </div>
                <Button onClick={runComparison} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : "Esegui Analisi Comparativa"}
                </Button>

                {results && (
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        {[results.user1, results.user2].map((res, i) => (
                            <div key={i} className="border rounded p-3 bg-slate-50">
                                <h3 className="font-bold border-b pb-2 mb-2">{res.email}</h3>
                                <div className="mb-2">{renderStatus(res)}</div>
                                
                                <div className="space-y-1 text-xs font-mono text-slate-600">
                                    <div className="font-bold text-slate-800 mt-2">Auth Metadata:</div>
                                    <pre className="bg-white p-1 rounded border overflow-x-auto">
                                        {res.auth?.success 
                                            ? JSON.stringify(res.auth.authData.user_metadata || {}, null, 2)
                                            : 'N/A'
                                        }
                                    </pre>
                                    
                                    <div className="font-bold text-slate-800 mt-2">App Metadata:</div>
                                    <pre className="bg-white p-1 rounded border overflow-x-auto">
                                        {res.auth?.success 
                                            ? JSON.stringify(res.auth.authData.app_metadata || {}, null, 2)
                                            : 'N/A'
                                        }
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default UserAuthDiagnostic;
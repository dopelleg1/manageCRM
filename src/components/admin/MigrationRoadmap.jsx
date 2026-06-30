import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle as TriangleAlert, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MigrationRoadmap = () => {
    return (
        <div className="space-y-6">
            <Alert variant="warning" className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200">
                <TriangleAlert className="h-5 w-5" color="currentColor" />
                <AlertTitle>Critical Warning</AlertTitle>
                <AlertDescription>
                    Migrating away from Supabase means losing built-in Auth, Row Level Security (RLS), and Real-time subscriptions. These must be manually re-implemented in the application layer or via a custom backend if migrating to a traditional DB provider.
                </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="w-full space-y-4">
                
                {/* Firebase Route */}
                <AccordionItem value="firebase" className="border rounded-lg bg-card px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                <span className="text-orange-600 font-bold">F</span>
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold">Migrate to Firebase / Firestore</h3>
                                <p className="text-sm text-muted-foreground font-normal">NoSQL Realtime DB • High API Changes • Est: 3-4 weeks</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="shadow-none border-dashed">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Pros</CardTitle></CardHeader>
                                <CardContent className="text-sm space-y-1 text-muted-foreground">
                                    <p>• Excellent Real-time sync replacement</p>
                                    <p>• Built-in Auth similar to Supabase</p>
                                    <p>• Great for client-side offline capabilities</p>
                                </CardContent>
                            </Card>
                            <Card className="shadow-none border-dashed">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Cons & Breaking Changes</CardTitle></CardHeader>
                                <CardContent className="text-sm space-y-1 text-muted-foreground">
                                    <p className="text-destructive">• Relational schema must be flattened</p>
                                    <p className="text-destructive">• Complex JOINs (e.g., assignments) are difficult</p>
                                    <p className="text-destructive">• Security Rules syntax is completely different from RLS</p>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold mb-2">Migration Steps:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                                <li>Export data from Postgres to JSON format.</li>
                                <li>Write a Node.js script to restructure relational data into document collections.</li>
                                <li>Replace `lib/customSupabaseClient.js` with Firebase init.</li>
                                <li>Rewrite `SupabaseAuthContext.jsx` to use Firebase Auth.</li>
                                <li>Rewrite `DataContext.jsx` to use Firestore listeners (`onSnapshot`).</li>
                                <li>Translate all Postgres RLS policies into Firestore `firestore.rules`.</li>
                            </ol>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Render / Railway Route */}
                <AccordionItem value="postgres" className="border rounded-lg bg-card px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-bold">P</span>
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold">Migrate to Standard Postgres (Render/Railway)</h3>
                                <p className="text-sm text-muted-foreground font-normal">Relational DB • Requires Custom Backend • Est: 4-6 weeks</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="shadow-none border-dashed">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Pros</CardTitle></CardHeader>
                                <CardContent className="text-sm space-y-1 text-muted-foreground">
                                    <p>• 100% Schema compatibility</p>
                                    <p>• Zero data transformation needed</p>
                                    <p>• Fixed pricing models (pay for compute, not API calls)</p>
                                </CardContent>
                            </Card>
                            <Card className="shadow-none border-dashed">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Cons & Breaking Changes</CardTitle></CardHeader>
                                <CardContent className="text-sm space-y-1 text-muted-foreground">
                                    <p className="text-destructive">• Requires building a custom Node.js/Express backend</p>
                                    <p className="text-destructive">• Loss of Supabase PostgREST auto-generated API</p>
                                    <p className="text-destructive">• Must manage custom Authentication logic (JWTs)</p>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold mb-2">Migration Steps:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                                <li>Create `pg_dump` of Supabase database schema and data.</li>
                                <li>Restore dump to Railway/Render managed Postgres instance.</li>
                                <li><Badge variant="outline" className="mr-1">Major</Badge> Build an Express API server to handle CRUD operations.</li>
                                <li>Implement custom JWT authentication and replace Supabase Auth.</li>
                                <li>Update React app to use `fetch()` or `axios` against new custom API instead of Supabase client.</li>
                                <li>Implement WebSockets manually if realtime map/calendar updates are required.</li>
                            </ol>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                
            </Accordion>
        </div>
    );
};

export default MigrationRoadmap;
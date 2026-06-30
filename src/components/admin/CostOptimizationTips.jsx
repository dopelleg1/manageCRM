import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingDown, Clock, Zap, DollarSign } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const CostOptimizationTips = () => {
    const optimizations = [
        {
            title: "Implement Query Result Caching",
            description: "Cache frequent static lookups (e.g., agents list, configurations) in React Query or local storage to dramatically reduce Supabase API calls.",
            savings: "$5-10/mo",
            difficulty: "Medium",
            timeEstimate: "2-3 days",
            impact: 80
        },
        {
            title: "Batch Operations",
            description: "When importing CSVs or reassigning multiple agents, use RPC functions or batch inserts rather than individual API calls in a loop.",
            savings: "$3-5/mo",
            difficulty: "High",
            timeEstimate: "4-5 days",
            impact: 65
        },
        {
            title: "Optimize RLS Policies",
            description: "Simplify RLS policies. Complex subqueries in policies run on every row evaluated, increasing CPU and Database Compute usage.",
            savings: "Improved Performance",
            difficulty: "Hard",
            timeEstimate: "1 week",
            impact: 90
        },
        {
            title: "Archive Old Data",
            description: "Move closed assignments or inactive potential contacts over 2 years old into cold storage or a separate archival table.",
            savings: "$2-4/mo",
            difficulty: "Medium",
            timeEstimate: "2 days",
            impact: 40
        },
        {
            title: "Implement Pagination",
            description: "Current DataContext fetches large datasets via paginated ranges up to 50k rows. Implementing server-side pagination with limit/offset will save bandwidth.",
            savings: "$10-15/mo",
            difficulty: "Hard",
            timeEstimate: "2 weeks",
            impact: 95
        }
    ];

    const totalPotentialSavings = "$20-34/mo";

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2 text-lg">
                            <TrendingDown className="h-5 w-5" />
                            Potential Savings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-800 dark:text-green-300">{totalPotentialSavings}</p>
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">If all optimizations applied</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Recommended Actions
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                    {optimizations.map((opt, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{opt.title}</CardTitle>
                                    <Badge variant={opt.difficulty === 'Hard' ? 'destructive' : opt.difficulty === 'Medium' ? 'default' : 'secondary'}>
                                        {opt.difficulty} Effort
                                    </Badge>
                                </div>
                                <CardDescription>{opt.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4 text-green-500" />
                                        <span className="font-medium">Savings:</span> {opt.savings}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-blue-500" />
                                        <span className="font-medium">Time:</span> {opt.timeEstimate}
                                    </div>
                                    <div className="col-span-3 mt-3 space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Impact on Database Cost/Performance</span>
                                            <span>{opt.impact}%</span>
                                        </div>
                                        <Progress value={opt.impact} className="h-2" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CostOptimizationTips;
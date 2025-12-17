import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    Store,
    TrendingUp,
    Activity,
    CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GlobalStats {
    totalShowrooms: number;
    totalCustomers: number;
    totalQuotations: number;
    activeShowrooms: number;
}

export const SuperAdminDashboard = () => {
    const [stats, setStats] = useState<GlobalStats>({
        totalShowrooms: 0,
        totalCustomers: 0,
        totalQuotations: 0,
        activeShowrooms: 0
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGlobalStats = async () => {
            try {
                setLoading(true);

                // Fetch Showrooms count
                const { count: showroomsCount } = await supabase
                    .from('showrooms')
                    .select('*', { count: 'exact', head: true });

                // Fetch Customers count
                const { count: customersCount } = await supabase
                    .from('customers')
                    .select('*', { count: 'exact', head: true });

                // Fetch Quotations count
                const { count: quotationsCount } = await supabase
                    .from('quotations')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    totalShowrooms: showroomsCount || 0,
                    totalCustomers: customersCount || 0,
                    totalQuotations: quotationsCount || 0,
                    activeShowrooms: showroomsCount || 0 // Assuming all are active for now
                });
            } catch (error) {
                console.error("Error fetching global stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGlobalStats();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Super Admin Dashboard</h2>
                <p className="text-muted-foreground">Overview of all showrooms and platform activity.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Showrooms</CardTitle>
                        <Store className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {loading ? "..." : stats.totalShowrooms}
                        </div>
                        <p className="text-xs text-blue-600/80">Registered on platform</p>
                    </CardContent>
                </Card>

                <Card className="border-green-100 bg-green-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">
                            {loading ? "..." : stats.totalCustomers}
                        </div>
                        <p className="text-xs text-green-600/80">Across all showrooms</p>
                    </CardContent>
                </Card>

                <Card className="border-purple-100 bg-purple-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
                        <Activity className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">
                            {loading ? "..." : stats.totalQuotations}
                        </div>
                        <p className="text-xs text-purple-600/80">Generated globally</p>
                    </CardContent>
                </Card>

                <Card className="border-orange-100 bg-orange-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Est.</CardTitle>
                        <CreditCard className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900">
                            -
                        </div>
                        <p className="text-xs text-orange-600/80">Coming soon</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Layout - Reusing AdminPanel or Custom Components */}
            {/* Use simple placeholder for now as requested to keep frontend same as admin initially but with extra stats */}
            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Platform Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500">More detailed analytics coming soon.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

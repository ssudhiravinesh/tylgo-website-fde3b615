import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Store,
    Activity,
    IndianRupee,
    Building2,
    Grid3X3,
    Package,
    TrendingUp,
    Clock,
    Trophy,
    ArrowUpRight
} from "lucide-react";
import { useSuperAdminStats } from "@/hooks/useSuperAdminStats";
import { BrandShowroomCard } from "./BrandShowroomCard";
import { CatalogueStatsCard } from "./CatalogueStatsCard";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export const SuperAdminDashboard = () => {
    // Default to last 30 days
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: addDays(new Date(), -30),
        to: new Date(),
    });

    const { data: stats, isLoading, error } = useSuperAdminStats(dateRange);

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-500 font-medium">Failed to load dashboard data</p>
                    <p className="text-sm text-gray-500 mt-1">{(error as Error).message}</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} L`;
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(1)} K`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Super Admin Dashboard</h2>
                    <p className="text-muted-foreground">Complete overview of all brands, showrooms, and platform activity.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            {/* Top-Level KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-indigo-100/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Brands</CardTitle>
                        <Building2 className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-900">
                            {isLoading ? "..." : stats?.totalBrands || 0}
                        </div>
                        <p className="text-xs text-indigo-600/80">Active brands</p>
                    </CardContent>
                </Card>

                <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Showrooms</CardTitle>
                        <Store className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {isLoading ? "..." : stats?.totalShowrooms || 0}
                        </div>
                        <p className="text-xs text-blue-600/80">Registered locations</p>
                    </CardContent>
                </Card>

                <Card className="border-green-100 bg-gradient-to-br from-green-50 to-green-100/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Customers</CardTitle>
                        <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">
                            {isLoading ? "..." : stats?.totalCustomers.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-green-600/80">Across all showrooms</p>
                    </CardContent>
                </Card>

                <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-purple-100/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quotations</CardTitle>
                        <Activity className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">
                            {isLoading ? "..." : stats?.totalQuotations.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-purple-600/80">Generated globally</p>
                    </CardContent>
                </Card>

                <Card className="border-cyan-100 bg-gradient-to-br from-cyan-50 to-cyan-100/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tiles</CardTitle>
                        <Grid3X3 className="h-4 w-4 text-cyan-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-900">
                            {isLoading ? "..." : stats?.totalTiles.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-cyan-600/80">In catalogue</p>
                    </CardContent>
                </Card>

                <Card className="border-pink-100 bg-gradient-to-br from-pink-50 to-pink-100/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Products</CardTitle>
                        <Package className="h-4 w-4 text-pink-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-900">
                            {isLoading ? "..." : stats?.totalProducts.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-pink-600/80">In catalogue</p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">
                            {isLoading ? "..." : formatCurrency(stats?.totalRevenue || 0)}
                        </div>
                        <p className="text-xs text-emerald-600/80">Total quotation value</p>
                    </CardContent>
                </Card>
            </div>

            {/* Growth Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-7 h-7 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">New Customers This Month</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {isLoading ? "..." : stats?.newCustomersThisMonth || 0}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                This Month
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center">
                                    <Activity className="w-7 h-7 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">New Quotations This Month</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {isLoading ? "..." : stats?.newQuotationsThisMonth || 0}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                This Month
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics & Charts */}
            {stats?.monthlyStats && stats?.brandPerformance && (
                <AnalyticsCharts
                    monthlyStats={stats.monthlyStats}
                    brandPerformance={stats.brandPerformance}
                />
            )}

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Brands & Showrooms Section - Takes 2 columns */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-500" />
                            Brands & Showrooms
                        </h3>
                        <Badge variant="outline">{stats?.totalBrands || 0} brands</Badge>
                    </div>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                                            <div className="space-y-2">
                                                <div className="w-32 h-5 bg-gray-200 rounded"></div>
                                                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    ) : stats?.brands && stats.brands.length > 0 ? (
                        <div className="space-y-4">
                            {stats.brands.map((brand) => (
                                <BrandShowroomCard key={brand.id} brand={brand} />
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex items-center justify-center py-8">
                                <p className="text-gray-500">No brands found</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Performance & Activity */}
                <div className="space-y-4">
                    {/* Top Performing Showrooms */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                Top Performing Showrooms
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center justify-between animate-pulse">
                                            <div className="w-24 h-4 bg-gray-200 rounded"></div>
                                            <div className="w-16 h-4 bg-gray-200 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : stats?.topShowrooms && stats.topShowrooms.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.topShowrooms.map((showroom, index) => (
                                        <div key={showroom.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                    index === 1 ? 'bg-gray-300 text-gray-700' :
                                                        index === 2 ? 'bg-amber-600 text-white' :
                                                            'bg-gray-200 text-gray-600'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <span className="font-medium text-sm">{showroom.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-green-600">
                                                    {formatCurrency(showroom.revenue)}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {showroom.quotationCount} quotes
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">No data available</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Quotations */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                Recent Quotations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="animate-pulse">
                                            <div className="w-full h-12 bg-gray-200 rounded-lg"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : stats?.recentQuotations && stats.recentQuotations.length > 0 ? (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {stats.recentQuotations.map((quotation) => (
                                        <div key={quotation.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-sm text-gray-800">
                                                    {quotation.customerName}
                                                </span>
                                                <span className="text-sm font-semibold text-green-600">
                                                    ₹{quotation.amount.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs">
                                                    {quotation.showroomName}
                                                </Badge>
                                                <span className="text-xs text-gray-400">
                                                    {formatDate(quotation.date)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">No recent quotations</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Catalogue Overview Section */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="w-5 h-5 text-pink-500" />
                    Catalogue Overview
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                    {isLoading ? (
                        <>
                            <Card className="animate-pulse h-64"></Card>
                            <Card className="animate-pulse h-64"></Card>
                        </>
                    ) : (
                        <>
                            <CatalogueStatsCard
                                title="Tiles Catalogue"
                                icon="tiles"
                                totalCount={stats?.totalTiles || 0}
                                categoryBreakdown={stats?.tilesByCategory || []}
                                recentItems={stats?.recentlyAddedTiles?.map(t => ({
                                    id: t.id,
                                    code: t.code,
                                    category: t.category,
                                    created_at: t.created_at
                                })) || []}
                            />
                            <CatalogueStatsCard
                                title="Products Catalogue"
                                icon="products"
                                totalCount={stats?.totalProducts || 0}
                                categoryBreakdown={stats?.productsByCategory || []}
                                recentItems={stats?.recentlyAddedProducts?.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    category: p.category,
                                    created_at: p.created_at
                                })) || []}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


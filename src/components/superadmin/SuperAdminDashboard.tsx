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
                    <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
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
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Super Admin Dashboard</h2>
                    <p className="text-muted-foreground">Complete overview of all brands, showrooms, and platform activity.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            {/* Top-Level KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Brands</CardTitle>
                        <Building2 className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {isLoading ? "..." : stats?.totalBrands || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Active brands</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Showrooms</CardTitle>
                        <Store className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {isLoading ? "..." : stats?.totalShowrooms || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Registered locations</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {isLoading ? "..." : stats?.totalCustomers.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Across all showrooms</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Quotations</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {isLoading ? "..." : stats?.totalQuotations.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Generated globally</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tiles</CardTitle>
                        <Grid3X3 className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {isLoading ? "..." : stats?.totalTiles.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">In catalogue</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
                        <Package className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {isLoading ? "..." : stats?.totalProducts.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">In catalogue</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {isLoading ? "..." : formatCurrency(stats?.totalRevenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Total quotation value</p>
                    </CardContent>
                </Card>
            </div>

            {/* Growth Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-7 h-7 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">New Customers This Month</p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {isLoading ? "..." : stats?.newCustomersThisMonth || 0}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                This Month
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card hover:border-primary/20 transition-colors">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <Activity className="w-7 h-7 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">New Quotations This Month</p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {isLoading ? "..." : stats?.newQuotationsThisMonth || 0}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
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
                        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" />
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
                                            <div className="w-12 h-12 bg-secondary rounded-xl"></div>
                                            <div className="space-y-2">
                                                <div className="w-32 h-5 bg-secondary rounded"></div>
                                                <div className="w-24 h-4 bg-secondary rounded"></div>
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
                                <p className="text-muted-foreground">No brands found</p>
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
                                <Trophy className="w-5 h-5 text-primary" />
                                Top Performing Showrooms
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center justify-between animate-pulse">
                                            <div className="w-24 h-4 bg-secondary rounded"></div>
                                            <div className="w-16 h-4 bg-secondary rounded"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : stats?.topShowrooms && stats.topShowrooms.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.topShowrooms.map((showroom, index) => (
                                        <div key={showroom.name} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-primary text-primary-foreground' :
                                                    index === 1 ? 'bg-primary/80 text-primary-foreground' :
                                                        index === 2 ? 'bg-primary/60 text-primary-foreground' :
                                                            'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <span className="font-medium text-sm">{showroom.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-primary">
                                                    {formatCurrency(showroom.revenue)}
                                                </p>
                                                <p className="text-xs text-muted-foreground/70">
                                                    {showroom.quotationCount} quotes
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-4">No data available</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Quotations */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Recent Quotations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="animate-pulse">
                                            <div className="w-full h-12 bg-secondary rounded-lg"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : stats?.recentQuotations && stats.recentQuotations.length > 0 ? (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {stats.recentQuotations.map((quotation) => (
                                        <div key={quotation.id} className="p-3 rounded-lg bg-muted hover:bg-muted transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-sm text-foreground">
                                                    {quotation.customerName}
                                                </span>
                                                <span className="text-sm font-semibold text-primary">
                                                    ₹{quotation.amount.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs">
                                                    {quotation.showroomName}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground/70">
                                                    {formatDate(quotation.date)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-4">No recent quotations</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Catalogue Overview Section */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
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


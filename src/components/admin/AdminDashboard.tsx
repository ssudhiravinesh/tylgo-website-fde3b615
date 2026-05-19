import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridLoader } from "@/components/ui/GridLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Users,
  FileText,
  Grid3X3,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers } from "@/hooks/useCustomers";
import { useQuotations } from "@/hooks/useQuotations";
import { useTiles } from "@/hooks/useTiles";

interface DashboardStats {
  totalCustomers: number;
  activeQuotations: number;
  tilesInCatalog: number;
  monthlyRevenue: number;
}

export interface RecentActivity {
  type: string;
  message: string;
  time: string;
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeQuotations: 0,
    tilesInCatalog: 0,
    monthlyRevenue: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: customers = [] } = useCustomers();
  const { data: quotations = [] } = useQuotations();
  const { data: tiles = [] } = useTiles();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Calculate monthly revenue from approved quotations
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyQuotations = quotations.filter(q => {
          const qDate = new Date(q.created_at);
          return qDate.getMonth() === currentMonth &&
            qDate.getFullYear() === currentYear &&
            q.status === 'approved';
        });

        const monthlyRevenue = monthlyQuotations.reduce((sum, q) => sum + (q.total_cost || 0), 0);

        // Count active quotations (not rejected)
        const activeQuotations = quotations.filter(q => q.status !== 'rejected' && q.status !== 'closed').length;

        setStats({
          totalCustomers: customers.length,
          activeQuotations,
          tilesInCatalog: tiles.length,
          monthlyRevenue
        });

        // Generate recent activity from actual data
        const activities: RecentActivity[] = [];

        // Add recent customers
        const recentCustomers = customers
          .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 2);

        recentCustomers.forEach(customer => {
          const timeAgo = getTimeAgo(customer.created_at || '');
          activities.push({
            type: "customer",
            message: `New customer added: ${customer.name}`,
            time: timeAgo
          });
        });

        // Add recent quotations
        const recentQuotations = quotations
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 2);

        recentQuotations.forEach(quotation => {
          const timeAgo = getTimeAgo(quotation.created_at);
          const customerName = quotation.customer?.name || 'Unknown Customer';
          activities.push({
            type: "quotation",
            message: `Quotation ${quotation.quotation_number} created for ${customerName}`,
            time: timeAgo
          });
        });

        // Add recent tiles
        const recentTiles = tiles
          .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 1);

        recentTiles.forEach(tile => {
          const timeAgo = getTimeAgo(tile.created_at || '');
          activities.push({
            type: "tile",
            message: `New tile added: ${tile.code}`,
            time: timeAgo
          });
        });

        // Sort activities by most recent
        activities.sort((a, b) => {
          // Simple sorting by time string - in production, you'd use actual dates
          return 0; // Keep existing order for now
        });

        setRecentActivity(activities.slice(0, 4));

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (customers.length > 0 || quotations.length > 0 || tiles.length > 0) {
      fetchDashboardData();
    }
  }, [customers, quotations, tiles]);

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const statsData = [
    {
      label: "Total Customers",
      value: stats.totalCustomers.toString(),
      icon: Users,
      change: "+12%",
      color: "text-primary"
    },
    {
      label: "Active Quotations",
      value: stats.activeQuotations.toString(),
      icon: FileText,
      change: "+8%",
      color: "text-green-600"
    },
    {
      label: "Tiles in Catalog",
      value: stats.tilesInCatalog.toString(),
      icon: Grid3X3,
      change: "+15%",
      color: "text-purple-600"
    },
    {
      label: "Monthly Revenue",
      value: formatCurrency(stats.monthlyRevenue),
      icon: TrendingUp,
      change: "+18%",
      color: "text-orange-600"
    }
  ];

  return {
    stats: statsData,
    recentActivity,
    loading
  };
};

export const AdminDashboard = () => {
  const { stats, loading } = useDashboardData();

  if (loading) {
    return <GridLoader className="py-12 min-h-[300px]" loadingText="Loading dashboard..." />;
  }

  const StatsGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    {stat.change}
                  </Badge>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor your business performance and manage system settings</p>
        </div>
        
        {/* Mobile Analytics Button */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <PieChart className="h-4 w-4" />
                Analytics
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>Dashboard Analytics</SheetTitle>
              </SheetHeader>
              <StatsGrid />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Stats Grid */}
      <div className="hidden lg:block">
        <StatsGrid />
      </div>
    </div>
  );
};
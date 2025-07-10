import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Grid3X3, 
  TrendingUp, 
  Calendar,
  BarChart3
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

interface RecentActivity {
  type: string;
  message: string;
  time: string;
}

export const AdminDashboard = () => {
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
        const activeQuotations = quotations.filter(q => q.status !== 'rejected').length;

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
            message: `New tile added: ${tile.name}`,
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

  const getChangePercentage = (current: number, previous: number): string => {
    if (previous === 0) return "+100%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const statsData = [
    { 
      label: "Total Customers", 
      value: stats.totalCustomers.toString(), 
      icon: Users, 
      change: "+12%", 
      color: "text-blue-600" 
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">Monitor your business performance and manage system settings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
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

      {/* Recent Activity */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity found</p>
              <p className="text-xs mt-1">Start by adding customers or creating quotations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
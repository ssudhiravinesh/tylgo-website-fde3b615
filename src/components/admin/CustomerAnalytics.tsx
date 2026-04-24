import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, FileText, Calendar, IndianRupee, Briefcase, Star, TrendingUp } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useQuotations } from "@/hooks/useQuotations";
import { useTiles } from "@/hooks/useTiles";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface CustomerAnalyticsProps {
  onBack: () => void;
}

export const CustomerAnalytics = ({ onBack }: CustomerAnalyticsProps) => {
  const { data: customers = [] } = useCustomers();
  const { data: quotations = [] } = useQuotations();
  const { data: tiles = [] } = useTiles();

  const [topCustomers, setTopCustomers] = useState<Array<{ name: string; totalValue: number; quotationCount: number }>>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [popularTiles, setPopularTiles] = useState<Array<{ code: string; usage: number }>>([]);
  const [topWorker, setTopWorker] = useState<{ name: string; closed: number; total: number } | null>(null);

  // Data for Charts
  const [revenueData, setRevenueData] = useState<Array<{ name: string; revenue: number }>>([]);
  const [statusData, setStatusData] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    if (customers.length > 0 || quotations.length > 0) {
      // --- 1. Top Customers ---
      const customerValues: { [customerId: string]: { name: string; totalValue: number; quotationCount: number } } = {};

      // --- 2. Worker Stats ---
      const workerStats: { [name: string]: { closed: number; total: number } } = {};

      // --- 3. Monthly Revenue Trend (Last 6 Months) ---
      const monthlyRevenue: { [key: string]: number } = {};
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short' });
        monthlyRevenue[key] = 0;
      }

      // --- 4. Status Breakdown ---
      const statusCounts = { approved: 0, draft: 0, closed: 0, other: 0 };

      quotations.forEach(quotation => {
        // Customer Stats
        const customerId = quotation.customer_id;
        const customer = customers.find(c => c.id === customerId);
        const value = quotation.total_cost || 0;

        if (customer) {
          if (!customerValues[customerId]) {
            customerValues[customerId] = { name: customer.name, totalValue: 0, quotationCount: 0 };
          }
          customerValues[customerId].totalValue += value;
          customerValues[customerId].quotationCount += 1;
        }

        // Worker Stats
        const workerName = quotation.worker?.name || 'Unknown';
        if (!workerStats[workerName]) {
          workerStats[workerName] = { closed: 0, total: 0 };
        }
        workerStats[workerName].total += 1;
        if (quotation.status === 'approved') {
          workerStats[workerName].closed += 1;
        }

        // Revenue Trend
        const qDate = new Date(quotation.created_at);
        // Using approved quotations for revenue
        if (quotation.status === 'approved') {
          const key = qDate.toLocaleString('default', { month: 'short' });
          if (monthlyRevenue[key] !== undefined) {
            monthlyRevenue[key] += value;
          }
        }

        // Status Breakdown
        const status = quotation.status || 'draft';
        if (status === 'approved') statusCounts.approved++;
        else if (status === 'draft') statusCounts.draft++;
        else if (status === 'closed') statusCounts.closed++;
        else statusCounts.other++;
      });

      // Set Top Customers
      const sortedCustomers = Object.values(customerValues)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);
      setTopCustomers(sortedCustomers);

      // Set Top Worker
      let bestWorker = null;
      let maxClosed = -1;
      Object.entries(workerStats).forEach(([name, stats]) => {
        if (stats.closed > maxClosed || (stats.closed === maxClosed && stats.total > (bestWorker?.total || 0))) {
          maxClosed = stats.closed;
          bestWorker = { name, ...stats };
        }
      });
      setTopWorker(bestWorker);

      // Set Conversion Rate
      const approvedCount = statusCounts.approved;
      const totalCount = quotations.length;
      const rate = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;
      setConversionRate(rate);

      // Set Revenue Chart Data
      const revChartData = Object.entries(monthlyRevenue).map(([name, revenue]) => ({
        name,
        revenue
      }));
      setRevenueData(revChartData);

      // Set Status Chart Data
      setStatusData([
        { name: 'Approved', value: statusCounts.approved },
        { name: 'Draft', value: statusCounts.draft },
        { name: 'Closed', value: statusCounts.closed },
        { name: 'Other', value: statusCounts.other },
      ].filter(d => d.value > 0));


      // --- 5. Popular Tiles (Fix: Use Code) ---
      const tileUsage: { [tileId: string]: { code: string; usage: number } } = {};
      quotations.forEach(quotation => {
        quotation.quotation_items?.forEach(item => {
          const tile = tiles.find(t => t.id === item.tile_id);
          if (tile) {
            if (!tileUsage[item.tile_id]) {
              tileUsage[item.tile_id] = { code: tile.code, usage: 0 };
            }
            tileUsage[item.tile_id].usage += 1;
          }
        });
      });

      const sortedTiles = Object.values(tileUsage)
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);
      setPopularTiles(sortedTiles);
    }
  }, [customers, quotations, tiles]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString()}`;
  };

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Overview of business performance and metrics</p>
        </div>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-primary">Total Customers</p>
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-blue-900">{customers.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-600">Conversion Rate</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">{Math.round(conversionRate)}%</div>
            <p className="text-xs text-green-700 mt-1">Quotations to Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-600">Revenue (This Month)</p>
              <IndianRupee className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(
                quotations
                  .filter(q => q.status === 'approved' && new Date(q.created_at).getMonth() === new Date().getMonth())
                  .reduce((sum, q) => sum + (q.total_cost || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-amber-600">Avg. Deal Value</p>
              <Briefcase className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900">
              {formatCurrency(
                quotations.length > 0
                  ? quotations.reduce((sum, q) => sum + (q.total_cost || 0), 0) / quotations.length
                  : 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Approved quotation value (Last 6 Months)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value >= 1000 ? value / 1000 + 'k' : value}`}
                />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Status</CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>By total quotation value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm text-white ${index === 0 ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.quotationCount} Quotations</p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">{formatCurrency(customer.totalValue)}</span>
                </div>
              ))}
              {topCustomers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Popular Tiles - Fixed to use Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Popular Tiles</span>
            </CardTitle>
            <CardDescription>Most quoted tiles by code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularTiles.map((tile, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm bg-muted px-2 py-1 rounded text-foreground">
                        {tile.code}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{tile.usage} quotes</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${(tile.usage / (popularTiles[0]?.usage || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {popularTiles.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No tile usage data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Worker Spotlight (if exists) */}
      {topWorker && topWorker.name !== 'Unknown' && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                <span className="font-bold uppercase tracking-wider text-sm opacity-90">Star Performer</span>
              </div>
              <h3 className="text-2xl font-bold">{topWorker.name}</h3>
              <p className="opacity-90 mt-1 text-sm">Leading the team with most closed deals</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{topWorker.closed}</div>
              <div className="text-sm opacity-80 uppercase tracking-wide">Closed Deals</div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

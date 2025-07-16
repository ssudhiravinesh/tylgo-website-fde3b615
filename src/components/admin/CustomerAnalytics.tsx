import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, FileText, Calendar, IndianRupee } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useQuotations } from "@/hooks/useQuotations";
import { useTiles } from "@/hooks/useTiles";

interface CustomerAnalyticsProps {
  onBack: () => void;
}

export const CustomerAnalytics = ({ onBack }: CustomerAnalyticsProps) => {
  const { data: customers = [] } = useCustomers();
  const { data: quotations = [] } = useQuotations();
  const { data: tiles = [] } = useTiles();
  
  const [topCustomers, setTopCustomers] = useState<Array<{name: string; totalValue: number}>>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [popularTiles, setPopularTiles] = useState<Array<{name: string; usage: number}>>([]);

  useEffect(() => {
    if (customers.length > 0 && quotations.length > 0) {
      // Calculate top customers by total quotation value
      const customerValues: { [customerId: string]: { name: string; totalValue: number } } = {};
      
      quotations.forEach(quotation => {
        const customerId = quotation.customer_id;
        const customer = customers.find(c => c.id === customerId);
        const value = quotation.total_cost || 0;
        
        if (customer) {
          if (!customerValues[customerId]) {
            customerValues[customerId] = { name: customer.name, totalValue: 0 };
          }
          customerValues[customerId].totalValue += value;
        }
      });
      
      const sortedCustomers = Object.values(customerValues)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 3);
      
      setTopCustomers(sortedCustomers);
      
      // Calculate conversion rate
      const approvedQuotations = quotations.filter(q => q.status === 'approved' || q.status === 'closed').length;
      const totalQuotations = quotations.length;
      const rate = totalQuotations > 0 ? (approvedQuotations / totalQuotations) * 100 : 0;
      setConversionRate(rate);
      
      // Calculate popular tiles from quotation items
      const tileUsage: { [tileId: string]: { name: string; usage: number } } = {};
      
      quotations.forEach(quotation => {
        quotation.quotation_items?.forEach(item => {
          const tile = tiles.find(t => t.id === item.tile_id);
          if (tile) {
            if (!tileUsage[item.tile_id]) {
              tileUsage[item.tile_id] = { name: tile.name, usage: 0 };
            }
            tileUsage[item.tile_id].usage += 1;
          }
        });
      });
      
      const sortedTiles = Object.values(tileUsage)
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 2);
      
      setPopularTiles(sortedTiles);
    }
  }, [customers, quotations, tiles]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const getUsagePercentage = (usage: number, maxUsage: number): number => {
    if (maxUsage === 0) return 0;
    return (usage / maxUsage) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const maxTileUsage = Math.max(...popularTiles.map(t => t.usage), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Analytics</h1>
          <p className="text-gray-600">Analyze customer behavior and business performance</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Top Customers - spans 2 columns */}
        <Card className="border-gray-200 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.length > 0 ? (
                topCustomers.map((customer, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{customer.name}</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(customer.totalValue)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm">No customer data available</p>
                  <p className="text-xs">Create quotations to see analytics</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-gray-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                <Badge className="h-4 w-4 text-white" />
              </div>
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{Math.round(conversionRate)}%</div>
              <p className="text-sm text-gray-600 mb-3">Quotations to Approved</p>
              <Badge variant="outline" className="text-green-600 border-green-200">
                {quotations.length} total quotations
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                <IndianRupee className="h-4 w-4 text-white" />
              </div>
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {formatCurrency(
                  quotations
                    .filter(q => q.status === 'approved' && new Date(q.created_at).getMonth() === new Date().getMonth())
                    .reduce((sum, q) => sum + (q.total_cost || 0), 0)
                )}
              </div>
              <p className="text-sm text-gray-600">This Month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Popular Tiles */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Popular Tiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularTiles.length > 0 ? (
                popularTiles.map((tile, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{tile.name}</span>
                      <span className="text-xs text-gray-500">{tile.usage} quotations</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{width: `${getUsagePercentage(tile.usage, maxTileUsage)}%`}}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="h-12 w-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <div className="h-6 w-6 bg-gray-300 rounded"></div>
                  </div>
                  <p className="text-sm">No tile usage data</p>
                  <p className="text-xs">Create quotations to see popular tiles</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quotations.slice(0, 3).map((quotation, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{quotation.customer?.name}</p>
                    <p className="text-xs text-gray-500">{quotation.quotation_number}</p>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(quotation.status)}`}>
                    {quotation.status}
                  </Badge>
                </div>
              ))}
              {quotations.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs">Activities will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Customers</span>
                <span className="text-xl font-bold text-blue-600">{customers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Quotations</span>
                <span className="text-xl font-bold text-yellow-600">
                  {quotations.filter(q => q.status === 'draft').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Closed Deals</span>
                <span className="text-xl font-bold text-green-600">
                  {quotations.filter(q => q.status === 'approved').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg. Deal Value</span>
                <span className="text-xl font-bold text-purple-600">
                  {formatCurrency(
                    quotations.length > 0 
                      ? quotations.reduce((sum, q) => sum + (q.total_cost || 0), 0) / quotations.length
                      : 0
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
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
      const approvedQuotations = quotations.filter(q => q.status === 'approved').length;
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.length > 0 ? (
                topCustomers.map((customer, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{customer.name}</span>
                    <span className="text-sm text-gray-600">{formatCurrency(customer.totalValue)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No customer data available</p>
                  <p className="text-xs">Create quotations to see analytics</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{Math.round(conversionRate)}%</div>
              <p className="text-sm text-gray-600 mt-2">Quotations to Approved</p>
              <Badge variant="outline" className="mt-2 text-green-600 border-green-200">
                {quotations.length} total quotations
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Popular Tiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {popularTiles.length > 0 ? (
                popularTiles.map((tile, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{tile.name}</span>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{width: `${getUsagePercentage(tile.usage, maxTileUsage)}%`}}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{tile.usage} quotations</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No tile usage data</p>
                  <p className="text-xs">Create quotations to see popular tiles</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
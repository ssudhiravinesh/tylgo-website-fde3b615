
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Grid3X3, 
  TrendingUp, 
  UserCog,
  Calendar
} from "lucide-react";
import { TileManagement } from "./TileManagement";
import { WorkerManagement } from "./WorkerManagement";

export const AdminPanel = () => {
  const [activeView, setActiveView] = useState<"dashboard" | "tile-management" | "worker-management">("dashboard");

  const stats = [
    { label: "Total Customers", value: "1,234", icon: Users, change: "+12%", color: "text-blue-600" },
    { label: "Active Quotations", value: "56", icon: FileText, change: "+8%", color: "text-green-600" },
    { label: "Tiles in Catalog", value: "2,890", icon: Grid3X3, change: "+145", color: "text-purple-600" },
    { label: "Monthly Revenue", value: "₹12.5L", icon: TrendingUp, change: "+18%", color: "text-orange-600" }
  ];

  const recentActivity = [
    { type: "customer", message: "New customer added by John Doe", time: "2 hours ago" },
    { type: "quotation", message: "Quotation Q045 sent to Priya Sharma", time: "3 hours ago" },
    { type: "tile", message: "15 new tiles added to catalog", time: "1 day ago" },
    { type: "user", message: "New worker account created for Mike Johnson", time: "2 days ago" }
  ];

  if (activeView === "tile-management") {
    return <TileManagement onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "worker-management") {
    return <WorkerManagement onBack={() => setActiveView("dashboard")} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
        <p className="text-gray-600">Monitor your business performance and manage system settings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start gap-3 h-12 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setActiveView("worker-management")}
            >
              <UserCog className="h-4 w-4" />
              Manage Workers
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12"
              onClick={() => setActiveView("tile-management")}
            >
              <Grid3X3 className="h-4 w-4" />
              Manage Tile Catalog
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

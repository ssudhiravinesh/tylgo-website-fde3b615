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
  Calendar,
  BarChart3,
  UserCheck
} from "lucide-react";

import { WorkerManagement } from "./WorkerManagement";
import { ReferencesView } from "./ReferencesView";
import { AdminDashboard, useDashboardData } from "./AdminDashboard";
import { CustomerAnalytics } from "./CustomerAnalytics";

export const AdminPanel = () => {
  const [activeView, setActiveView] = useState<"dashboard" | "worker-management" | "customer-analytics" | "references">("dashboard");

  // Always call hooks at the top level to avoid conditional hook calls
  const { recentActivity } = useDashboardData();



  if (activeView === "worker-management") {
    return <WorkerManagement onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "references") {
    return <ReferencesView onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "customer-analytics") {
    return <CustomerAnalytics onBack={() => setActiveView("dashboard")} />;
  }

  return (
    <div className="space-y-6">
      <AdminDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              className="w-full justify-start gap-3 h-12 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setActiveView("worker-management")}
            >
              <UserCog className="h-4 w-4" />
              Manage Workers
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setActiveView("references")}
            >
              <UserCheck className="h-4 w-4" />
              View References
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setActiveView("customer-analytics")}
            >
              <BarChart3 className="h-4 w-4" />
              Customer Analytics
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
    </div>
  );
};

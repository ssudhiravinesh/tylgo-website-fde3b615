import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, BarChart3 } from "lucide-react";
import type { Worker, QuotationStats } from "@/hooks/useWorkerData";

interface WorkerStatsProps {
  workers: Worker[];
  quotationStats?: QuotationStats;
}

export const WorkerStats = ({ workers, quotationStats }: WorkerStatsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold text-gray-800">{workers?.length || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Quotations</p>
              <p className="text-2xl font-bold text-gray-800">{quotationStats?.totalQuotations || 0}</p>
            </div>
            <FileText className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Quotations</p>
              <p className="text-2xl font-bold text-gray-800">{quotationStats?.activeQuotations || 0}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
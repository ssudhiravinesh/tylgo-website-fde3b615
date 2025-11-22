import { Button } from "@/components/ui/button";
import { FileText, Eye, Key, Trash2, CheckCircle, Clock } from "lucide-react";
import type { Worker } from "@/hooks/useWorkerData";
interface WorkerCardProps {
  worker: Worker;
  onViewQuotations: (worker: Worker) => void;
  onResetPassword: (worker: Worker) => void;
  onDelete: (worker: Worker) => void;
}
export const WorkerCard = ({
  worker,
  onViewQuotations,
  onResetPassword,
  onDelete
}: WorkerCardProps) => {
  return <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <h3 className="font-medium text-gray-800">{worker.name}</h3>
        <p className="text-sm text-gray-600">{worker.email}</p>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">
              {worker.quotation_count || 0} quotations
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600">
              {worker.approved_quotations || 0} approved
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-600">
              {worker.quotation_count - worker.approved_quotations || 0} pending
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        
        <Button variant="outline" size="sm" onClick={() => onResetPassword(worker)}>
          <Key className="h-4 w-4 mr-1" />
          Reset Password
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(worker)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>;
};
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import { useWorkerManagement } from "@/hooks/useWorkerManagement";
import { toast } from "sonner";
import { WorkerCard } from "./WorkerCard";
import { WorkerStats } from "./WorkerStats";
import { AddWorkerDialog } from "./AddWorkerDialog";
import { WorkerDialogs } from "./WorkerDialogs";
import type { Worker } from "@/hooks/useWorkerData";

interface WorkerManagementProps {
  onBack: () => void;
}

export const WorkerManagement = ({ onBack }: WorkerManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isQuotationsDialogOpen, setIsQuotationsDialogOpen] = useState(false);
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { 
    workers, 
    workerQuotations, 
    quotationStats,
    isLoading, 
    resetPasswordMutation,
    addWorkerMutation,
    deleteWorkerMutation,
    fetchWorkerQuotations 
  } = useWorkerManagement();

  const filteredWorkers = workers?.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handlePasswordReset = (data: { newPassword: string; confirmPassword: string }) => {
    if (selectedWorker) {
      resetPasswordMutation.mutate(
        { userId: selectedWorker.id, newPassword: data.newPassword },
        {
          onSuccess: () => {
            setIsPasswordDialogOpen(false);
            setSelectedWorker(null);
          },
        }
      );
    }
  };

  const handleAddWorker = (data: { name: string; email: string; password: string }) => {
    addWorkerMutation.mutate(
      { 
        name: data.name, 
        email: data.email, 
        password: data.password 
      },
      {
        onSuccess: () => {
          setIsAddWorkerDialogOpen(false);
          toast.success("Worker account created successfully");
        },
      }
    );
  };

  const handleViewQuotations = (worker: Worker) => {
    setSelectedWorker(worker);
    fetchWorkerQuotations(worker.id);
    setIsQuotationsDialogOpen(true);
  };

  const handleDeleteWorker = () => {
    if (selectedWorker) {
      deleteWorkerMutation.mutate(selectedWorker.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedWorker(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading workers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Worker Management</h1>
          <p className="text-gray-600">Manage worker accounts and track their quotations</p>
        </div>
        <AddWorkerDialog
          isOpen={isAddWorkerDialogOpen}
          onOpenChange={setIsAddWorkerDialogOpen}
          onSubmit={handleAddWorker}
          isLoading={addWorkerMutation.isPending}
        />
      </div>

      {/* Worker Stats */}
      <WorkerStats workers={workers || []} quotationStats={quotationStats} />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search workers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Workers List */}
      <Card>
        <CardHeader>
          <CardTitle>Workers ({filteredWorkers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredWorkers.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                onViewQuotations={handleViewQuotations}
                onResetPassword={(worker) => {
                  setSelectedWorker(worker);
                  setIsPasswordDialogOpen(true);
                }}
                onDelete={(worker) => {
                  setSelectedWorker(worker);
                  setIsDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <WorkerDialogs
        selectedWorker={selectedWorker}
        workerQuotations={workerQuotations}
        isPasswordDialogOpen={isPasswordDialogOpen}
        isQuotationsDialogOpen={isQuotationsDialogOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        resetPasswordLoading={resetPasswordMutation.isPending}
        deleteWorkerLoading={deleteWorkerMutation.isPending}
        onPasswordDialogChange={setIsPasswordDialogOpen}
        onQuotationsDialogChange={setIsQuotationsDialogOpen}
        onDeleteDialogChange={setIsDeleteDialogOpen}
        onPasswordReset={handlePasswordReset}
        onDeleteWorker={handleDeleteWorker}
      />
    </div>
  );
};
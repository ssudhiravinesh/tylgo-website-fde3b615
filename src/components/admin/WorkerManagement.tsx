
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  Key,
  Search,
  Eye,
  BarChart3,
  UserPlus,
  Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWorkerManagement } from "@/hooks/useWorkerManagement";
import { toast } from "sonner";

interface WorkerManagementProps {
  onBack: () => void;
}

const passwordResetSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const addWorkerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
type AddWorkerFormData = z.infer<typeof addWorkerSchema>;

export const WorkerManagement = ({ onBack }: WorkerManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
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

  const passwordForm = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const addWorkerForm = useForm<AddWorkerFormData>({
    resolver: zodResolver(addWorkerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const filteredWorkers = workers?.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handlePasswordReset = (data: PasswordResetFormData) => {
    if (selectedWorker) {
      resetPasswordMutation.mutate(
        { userId: selectedWorker.id, newPassword: data.newPassword },
        {
          onSuccess: () => {
            setIsPasswordDialogOpen(false);
            setSelectedWorker(null);
            passwordForm.reset();
          },
          onError: (error: any) => {
            console.error('Password reset error:', error);
            // Don't auto-close dialog on error so user can try again
          }
        }
      );
    }
  };

  const handleAddWorker = (data: AddWorkerFormData) => {
    addWorkerMutation.mutate(
      { 
        name: data.name, 
        email: data.email, 
        password: data.password 
      },
      {
        onSuccess: () => {
          setIsAddWorkerDialogOpen(false);
          addWorkerForm.reset();
          toast.success("Worker account created successfully");
        },
      }
    );
  };

  const handleViewQuotations = (worker: any) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
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
        <Dialog open={isAddWorkerDialogOpen} onOpenChange={setIsAddWorkerDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Worker
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Worker</DialogTitle>
              <DialogDescription>
                Create a new worker account with login credentials
              </DialogDescription>
            </DialogHeader>
            <Form {...addWorkerForm}>
              <form onSubmit={addWorkerForm.handleSubmit(handleAddWorker)} className="space-y-4">
                <FormField
                  control={addWorkerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter worker's full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addWorkerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter worker's email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addWorkerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addWorkerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddWorkerDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addWorkerMutation.isPending}>
                    {addWorkerMutation.isPending ? "Creating..." : "Create Worker"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Worker Stats */}
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
              <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewQuotations(worker)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Quotations
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWorker(worker);
                      setIsPasswordDialogOpen(true);
                    }}
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Reset Password
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWorker(worker);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedWorker?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordReset)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Worker Quotations Dialog */}
      <Dialog open={isQuotationsDialogOpen} onOpenChange={setIsQuotationsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quotations by {selectedWorker?.name}</DialogTitle>
            <DialogDescription>
              View all quotations created by this worker
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {workerQuotations?.map((quotation) => (
                <div key={quotation.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{quotation.quotation_number}</h4>
                    <Badge className={getStatusColor(quotation.status)}>
                      {quotation.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Customer: {quotation.customer?.name}</p>
                      <p className="text-gray-600">Mobile: {quotation.customer?.mobile}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total: ₹{quotation.total_cost}</p>
                      <p className="text-gray-600">
                        Created: {new Date(quotation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {quotation.notes && (
                    <p className="text-sm text-gray-600 mt-2">Notes: {quotation.notes}</p>
                  )}
                </div>
              ))}
              {(!workerQuotations || workerQuotations.length === 0) && (
                <p className="text-center text-gray-500 py-8">No quotations found for this worker</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Worker Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Worker</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedWorker?.name}? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteWorker}
              disabled={deleteWorkerMutation.isPending}
            >
              {deleteWorkerMutation.isPending ? "Deleting..." : "Delete Worker"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

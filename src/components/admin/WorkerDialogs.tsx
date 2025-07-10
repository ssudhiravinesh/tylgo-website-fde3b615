import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import type { Worker } from "@/hooks/useWorkerData";
import type { WorkerQuotation } from "@/hooks/useWorkerQuotations";

const passwordResetSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

interface WorkerDialogsProps {
  selectedWorker: Worker | null;
  workerQuotations: WorkerQuotation[];
  isPasswordDialogOpen: boolean;
  isQuotationsDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  resetPasswordLoading: boolean;
  deleteWorkerLoading: boolean;
  onPasswordDialogChange: (open: boolean) => void;
  onQuotationsDialogChange: (open: boolean) => void;
  onDeleteDialogChange: (open: boolean) => void;
  onPasswordReset: (data: PasswordResetFormData) => void;
  onDeleteWorker: () => void;
}

export const WorkerDialogs = ({
  selectedWorker,
  workerQuotations,
  isPasswordDialogOpen,
  isQuotationsDialogOpen,
  isDeleteDialogOpen,
  resetPasswordLoading,
  deleteWorkerLoading,
  onPasswordDialogChange,
  onQuotationsDialogChange,
  onDeleteDialogChange,
  onPasswordReset,
  onDeleteWorker,
}: WorkerDialogsProps) => {
  const passwordForm = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={onPasswordDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedWorker?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordReset)} className="space-y-4">
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
                <Button type="button" variant="outline" onClick={() => onPasswordDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={resetPasswordLoading}>
                  {resetPasswordLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Worker Quotations Dialog */}
      <Dialog open={isQuotationsDialogOpen} onOpenChange={onQuotationsDialogChange}>
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
      <Dialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Worker</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedWorker?.name}? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onDeleteDialogChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={onDeleteWorker}
              disabled={deleteWorkerLoading}
            >
              {deleteWorkerLoading ? "Deleting..." : "Delete Worker"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
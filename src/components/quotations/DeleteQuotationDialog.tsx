
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteQuotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quotationNumber: string;
  isDeleting?: boolean;
}

export const DeleteQuotationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  quotationNumber,
  isDeleting = false 
}: DeleteQuotationDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Quotation
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete quotation <strong>{quotationNumber}</strong>? 
            This action cannot be undone and will permanently remove the quotation from the database.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuotationForm } from "./QuotationForm";
import type { Quotation } from "@/hooks/useQuotations";

interface EditQuotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onSuccess?: () => void;
}

export const EditQuotationDialog = ({ isOpen, onClose, quotation, onSuccess }: EditQuotationDialogProps) => {
  const handleSuccess = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  if (!quotation) return null;

  // For now, we'll show a placeholder since the QuotationForm needs selectedRoomsData
  // which we'd need to derive from the quotation items
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quotation {quotation.quotation_number}</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <p className="text-gray-600">Edit functionality will be implemented in a future update.</p>
          <div className="flex justify-end mt-4">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

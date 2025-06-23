
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quotation {quotation.quotation_number}</DialogTitle>
        </DialogHeader>
        <QuotationForm
          editMode={true}
          existingQuotation={quotation}
          onBack={onClose}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};

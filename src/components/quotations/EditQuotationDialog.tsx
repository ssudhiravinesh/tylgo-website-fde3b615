
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuotationForm } from "./QuotationForm";
import type { Quotation } from "@/hooks/useQuotations";

interface EditQuotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
}

export const EditQuotationDialog = ({ 
  isOpen, 
  onClose, 
  quotation 
}: EditQuotationDialogProps) => {
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (isOpen && quotation) {
      setIsFormVisible(true);
    } else {
      setIsFormVisible(false);
    }
  }, [isOpen, quotation]);

  const handleSuccess = () => {
    onClose();
  };

  const handleBack = () => {
    onClose();
  };

  if (!quotation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quotation {quotation.quotation_number}</DialogTitle>
          <DialogDescription>
            Update the quotation details and save your changes.
          </DialogDescription>
        </DialogHeader>
        
        {isFormVisible && (
          <div className="mt-4">
            <QuotationForm
              onBack={handleBack}
              onSuccess={handleSuccess}
              editMode={true}
              existingQuotation={quotation}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

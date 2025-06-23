
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuotationEmptyStateProps {
  hasSearchTerm: boolean;
  userRole: "admin" | "worker";
  onCreate: () => void;
}

export const QuotationEmptyState = ({ hasSearchTerm, userRole, onCreate }: QuotationEmptyStateProps) => {
  return (
    <div className="text-center py-12">
      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-600 mb-2">No quotations found</h3>
      <p className="text-gray-500 mb-4">
        {hasSearchTerm ? "Try adjusting your search terms" : "No quotations have been created yet"}
      </p>
      {userRole === "worker" && !hasSearchTerm && (
        <Button 
          onClick={onCreate}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Quotation
        </Button>
      )}
    </div>
  );
};


import { useState } from "react";
import { useQuotations, useDeleteQuotation } from "@/hooks/useQuotations";
import { QuotationForm } from "./QuotationForm";
import { QuotationDetails } from "./QuotationDetails";
import { QuotationEditForm } from "./QuotationEditForm";
import { QuotationListHeader } from "./QuotationListHeader";
import { QuotationSearchBar } from "./QuotationSearchBar";
import { QuotationSummaryCards } from "./QuotationSummaryCards";
import { QuotationCard } from "./QuotationCard";
import { QuotationEmptyState } from "./QuotationEmptyState";
import { toast } from "sonner";

interface QuotationListProps {
  userRole: "admin" | "worker";
}

type ViewMode = "list" | "create" | "details" | "edit";

export const QuotationList = ({ userRole }: QuotationListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  
  const { data: quotations = [], isLoading } = useQuotations();
  const deleteQuotationMutation = useDeleteQuotation();
  
  const filteredQuotations = quotations.filter(quotation =>
    quotation.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.customer?.mobile.includes(searchTerm)
  );

  const selectedQuotation = selectedQuotationId 
    ? quotations.find(q => q.id === selectedQuotationId)
    : null;

  const handleViewDetails = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setViewMode("details");
  };

  const handleEditQuotation = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setViewMode("edit");
  };

  const handleDeleteQuotation = async (quotationId: string, quotationNumber: string) => {
    try {
      console.log('Deleting quotation from list:', quotationId);
      await deleteQuotationMutation.mutateAsync(quotationId);
      console.log('Quotation deleted successfully from list');
    } catch (error) {
      console.error("Error deleting quotation from list:", error);
      toast.error("Failed to delete quotation");
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedQuotationId(null);
  };

  const handleCreateSuccess = () => {
    setViewMode("list");
  };

  const handleEditSuccess = () => {
    setViewMode("details");
  };

  if (viewMode === "create") {
    return (
      <QuotationForm 
        onBack={handleBackToList}
        onSuccess={handleCreateSuccess}
      />
    );
  }

  if (viewMode === "edit" && selectedQuotation) {
    return (
      <QuotationEditForm
        quotation={selectedQuotation}
        onBack={() => setViewMode("details")}
        onSuccess={handleEditSuccess}
      />
    );
  }

  if (viewMode === "details" && selectedQuotation) {
    return (
      <QuotationDetails
        quotation={selectedQuotation}
        onBack={handleBackToList}
        onEdit={() => handleEditQuotation(selectedQuotation.id)}
        onDelete={() => {
          console.log("Delete quotation:", selectedQuotation.id);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QuotationListHeader 
        userRole={userRole}
        onCreate={() => setViewMode("create")}
      />

      <QuotationSearchBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <QuotationSummaryCards quotations={quotations} />

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredQuotations.map((quotation) => (
          <QuotationCard
            key={quotation.id}
            quotation={quotation}
            userRole={userRole}
            onViewDetails={handleViewDetails}
            onEdit={handleEditQuotation}
            onDelete={handleDeleteQuotation}
            isDeleting={deleteQuotationMutation.isPending}
          />
        ))}
      </div>

      {filteredQuotations.length === 0 && !isLoading && (
        <QuotationEmptyState
          hasSearchTerm={!!searchTerm}
          userRole={userRole}
          onCreate={() => setViewMode("create")}
        />
      )}
    </div>
  );
};

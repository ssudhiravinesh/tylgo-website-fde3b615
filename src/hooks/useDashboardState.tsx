
import { useState } from "react";
import type { ActiveView } from "@/types/dashboard";

export const useDashboardState = () => {
  const [activeView, setActiveView] = useState<ActiveView>("customers");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);

  const handleViewQuotation = (quotationId: string) => {
    console.log("View quotation:", quotationId);
    setSelectedQuotationId(quotationId);
    setActiveView("view-quotation");
  };

  const handleEditQuotation = (quotationId: string) => {
    console.log("Edit quotation:", quotationId);
    setSelectedQuotationId(quotationId);
    setActiveView("edit-quotation");
  };

  return {
    activeView,
    setActiveView,
    isSidebarOpen,
    setIsSidebarOpen,
    selectedQuotationId,
    handleViewQuotation,
    handleEditQuotation
  };
};

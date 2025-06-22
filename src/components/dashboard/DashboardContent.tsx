
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationList } from "@/components/quotations/QuotationList";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { QuotationDetails } from "@/components/quotations/QuotationDetails";
import { AdminPanel } from "@/components/admin/AdminPanel";
import type { ActiveView, User } from "@/types/dashboard";

interface DashboardContentProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  user: User;
  selectedQuotationId: string | null;
  onViewQuotation: (quotationId: string) => void;
  onEditQuotation: (quotationId: string) => void;
}

export const DashboardContent = ({
  activeView,
  setActiveView,
  user,
  selectedQuotationId,
  onViewQuotation,
  onEditQuotation
}: DashboardContentProps) => {
  console.log("Rendering content for view:", activeView);
  
  try {
    switch (activeView) {
      case "customers":
        return <CustomerList onAddCustomer={() => setActiveView("add-customer")} userRole={user.role} />;
      case "add-customer":
        return <CustomerForm onBack={() => setActiveView("customers")} />;
      case "tiles":
        return <TileCatalog />;
      case "quotations":
        return (
          <QuotationList 
            onAddQuotation={() => setActiveView("add-quotation")} 
            onViewQuotation={onViewQuotation}
            onEditQuotation={onEditQuotation}
            userRole={user.role} 
          />
        );
      case "add-quotation":
        return <QuotationForm onBack={() => setActiveView("quotations")} />;
      case "edit-quotation":
        return selectedQuotationId ? (
          <QuotationForm 
            onBack={() => setActiveView("quotations")} 
            quotationId={selectedQuotationId}
            isEditing={true}
          />
        ) : <div>Quotation not found</div>;
      case "view-quotation":
        return selectedQuotationId ? (
          <QuotationDetails 
            quotationId={selectedQuotationId}
            onBack={() => setActiveView("quotations")}
            onEdit={() => onEditQuotation(selectedQuotationId)}
            userRole={user.role}
          />
        ) : <div>Quotation not found</div>;
      case "admin":
        return user.role === "admin" ? <AdminPanel /> : <div>Access denied</div>;
      default:
        return <CustomerList onAddCustomer={() => setActiveView("add-customer")} userRole={user.role} />;
    }
  } catch (error) {
    console.error("Error rendering content:", error);
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">There was an error loading this section.</p>
        <button 
          onClick={() => setActiveView("customers")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Customers
        </button>
      </div>
    );
  }
};

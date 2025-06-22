
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationList } from "@/components/quotations/QuotationList";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { QuotationDetails } from "@/components/quotations/QuotationDetails";
import { AdminPanel } from "@/components/admin/AdminPanel";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker";
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export type ActiveView = 
  | "customers" 
  | "add-customer" 
  | "tiles" 
  | "quotations" 
  | "add-quotation"
  | "edit-quotation"
  | "view-quotation"
  | "admin";

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>("customers");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);

  const handleViewQuotation = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setActiveView("view-quotation");
  };

  const handleEditQuotation = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setActiveView("edit-quotation");
  };

  const renderContent = () => {
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
            onViewQuotation={handleViewQuotation}
            onEditQuotation={handleEditQuotation}
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
            onEdit={() => handleEditQuotation(selectedQuotationId)}
            userRole={user.role}
          />
        ) : <div>Quotation not found</div>;
      case "admin":
        return user.role === "admin" ? <AdminPanel /> : <div>Access denied</div>;
      default:
        return <CustomerList onAddCustomer={() => setActiveView("add-customer")} userRole={user.role} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        isOpen={isSidebarOpen}
        activeView={activeView}
        onViewChange={setActiveView}
        userRole={user.role}
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          user={user}
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

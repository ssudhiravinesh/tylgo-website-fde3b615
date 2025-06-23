
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationList } from "@/components/quotations/QuotationList";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { CustomerRoomManagement } from "@/components/rooms/CustomerRoomManagement";
import { QuotationForm } from "@/components/quotations/QuotationForm";

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
  | "admin"
  | "rooms"
  | "create-quotation";

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>("customers");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const handleManageRooms = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveView("rooms");
  };

  const handleCreateQuotation = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveView("create-quotation");
  };

  const renderContent = () => {
    switch (activeView) {
      case "customers":
        return (
          <CustomerList 
            onAddCustomer={() => setActiveView("add-customer")} 
            onManageRooms={handleManageRooms}
            onCreateQuotation={handleCreateQuotation}
            userRole={user.role} 
          />
        );
      case "add-customer":
        return user.role === "worker" ? (
          <CustomerForm onBack={() => setActiveView("customers")} />
        ) : (
          <div>Access denied</div>
        );
      case "tiles":
        return user.role === "worker" ? <TileCatalog /> : <div>Access denied</div>;
      case "quotations":
        return <QuotationList userRole={user.role} />;
      case "admin":
        return user.role === "admin" ? <AdminPanel /> : <div>Access denied</div>;
      case "rooms":
        return user.role === "worker" && selectedCustomerId ? (
          <CustomerRoomManagement 
            customerId={selectedCustomerId}
            onBack={() => setActiveView("customers")}
            onGenerateQuotation={handleCreateQuotation}
          />
        ) : (
          <div>Access denied</div>
        );
      case "create-quotation":
        return user.role === "worker" && selectedCustomerId ? (
          <QuotationForm 
            customerId={selectedCustomerId}
            onBack={() => setActiveView("customers")}
            onSuccess={() => setActiveView("quotations")}
          />
        ) : (
          <div>Access denied</div>
        );
      default:
        return (
          <CustomerList 
            onAddCustomer={() => setActiveView("add-customer")} 
            onManageRooms={handleManageRooms}
            onCreateQuotation={handleCreateQuotation}
            userRole={user.role} 
          />
        );
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

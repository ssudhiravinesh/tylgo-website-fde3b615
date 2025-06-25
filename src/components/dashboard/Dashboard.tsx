
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationList } from "@/components/quotations/QuotationList";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { CustomerRoomManagement } from "@/components/rooms/CustomerRoomManagement";

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
  | "rooms";

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>("customers");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCustomerForQuote, setSelectedCustomerForQuote] = useState<string | null>(null);

  const handleNewQuote = (customerId: string) => {
    setSelectedCustomerForQuote(customerId);
    setActiveView("rooms");
  };

  const handleNewQuoteFromForm = (customerId: string) => {
    setSelectedCustomerForQuote(customerId);
    setActiveView("rooms");
  };

  const handleBackFromRooms = () => {
    setSelectedCustomerForQuote(null);
    setActiveView("customers");
  };

  const renderContent = () => {
    switch (activeView) {
      case "customers":
        return (
          <CustomerList 
            onAddCustomer={() => setActiveView("add-customer")} 
            onNewQuote={handleNewQuote}
            userRole={user.role} 
          />
        );
      case "add-customer":
        return user.role === "worker" ? (
          <CustomerForm 
            onBack={() => setActiveView("customers")} 
            onNewQuote={handleNewQuoteFromForm}
          />
        ) : <div>Access denied</div>;
      case "tiles":
        return user.role === "worker" ? <TileCatalog /> : <div>Access denied</div>;
      case "quotations":
        return <QuotationList userRole={user.role} />;
      case "admin":
        return user.role === "admin" ? <AdminPanel /> : <div>Access denied</div>;
      case "rooms":
        return user.role === "worker" ? (
          <CustomerRoomManagement 
            preSelectedCustomerId={selectedCustomerForQuote}
            onBack={handleBackFromRooms}
          />
        ) : <div>Access denied</div>;
      default:
        return (
          <CustomerList 
            onAddCustomer={() => setActiveView("add-customer")} 
            onNewQuote={handleNewQuote}
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


import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationList } from "@/components/quotations/QuotationList";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { RoomList } from "@/components/rooms/RoomList";
import { RoomForm } from "@/components/rooms/RoomForm";

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
  | "view-rooms"
  | "add-room";

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<ActiveView>("customers");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeView) {
      case "customers":
        return <CustomerList onAddCustomer={() => setActiveView("add-customer")} userRole={user.role} onNewQuote={() => setActiveView("view-rooms")} />;
      case "add-customer":
        return user.role === "worker" ? <CustomerForm onBack={() => setActiveView("customers")} /> : <div>Access denied</div>;
      case "tiles":
        return <TileCatalog />;
      case "quotations":
        return <QuotationList userRole={user.role} />;
      case "admin":
        return user.role === "admin" ? <AdminPanel /> : <div>Access denied</div>;
      case "view-rooms":
        return user.role === "worker" ? <RoomList onAddRoom={() => setActiveView("add-room")} /> : <div>Access denied</div>;
      case "add-room":
        return user.role === "worker" ? <RoomForm onBack={() => setActiveView("view-rooms")} /> : <div>Access denied</div>;
      default:
        return <CustomerList onAddCustomer={() => setActiveView("add-customer")} userRole={user.role} onNewQuote={() => setActiveView("view-rooms")} />;
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

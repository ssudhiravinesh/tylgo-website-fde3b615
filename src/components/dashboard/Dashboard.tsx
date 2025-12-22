import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { DashboardContent } from "./DashboardContent";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker" | "super_admin";
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
  | "products"
  | "rooms"
  | "manage-tiles";

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
          <DashboardContent
            activeView={activeView}
            userRole={user.role}
            setActiveView={setActiveView}
            handlers={{
              handleNewQuote,
              handleNewQuoteFromForm,
              handleBackFromRooms,
              selectedCustomerForQuote
            }}
          />
        </main>
      </div>
    </div>
  );
};


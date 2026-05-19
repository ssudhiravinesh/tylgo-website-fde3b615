import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { DashboardContent } from "./DashboardContent";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCustomerForQuote, setSelectedCustomerForQuote] = useState<string | null>(null);

  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewQuote = (customerId: string) => {
    setSelectedCustomerForQuote(customerId);
    handleViewChange("rooms");
  };

  const handleNewQuoteFromForm = (customerId: string) => {
    setSelectedCustomerForQuote(customerId);
    handleViewChange("rooms");
  };

  const handleBackFromRooms = () => {
    setSelectedCustomerForQuote(null);
    handleViewChange("customers");
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      <Sidebar
        isOpen={isSidebarOpen}
        activeView={activeView}
        onViewChange={handleViewChange}
        userRole={user.role}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 p-6 overflow-auto animate-in-up">
          <DashboardContent
            activeView={activeView}
            userRole={user.role}
            setActiveView={handleViewChange}
            handlers={{
              handleNewQuote,
              handleNewQuoteFromForm,
              handleBackFromRooms,
              selectedCustomerForQuote,
            }}
          />
        </main>
      </div>
    </div>
  );
};

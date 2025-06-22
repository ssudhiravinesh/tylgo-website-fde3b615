
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { DashboardContent } from "./DashboardContent";
import { useDashboardState } from "@/hooks/useDashboardState";
import type { DashboardProps } from "@/types/dashboard";

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const {
    activeView,
    setActiveView,
    isSidebarOpen,
    setIsSidebarOpen,
    selectedQuotationId,
    handleViewQuotation,
    handleEditQuotation
  } = useDashboardState();

  console.log("Dashboard render - user:", user.name, "activeView:", activeView);

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
            setActiveView={setActiveView}
            user={user}
            selectedQuotationId={selectedQuotationId}
            onViewQuotation={handleViewQuotation}
            onEditQuotation={handleEditQuotation}
          />
        </main>
      </div>
    </div>
  );
};

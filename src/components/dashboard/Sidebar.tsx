
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus, 
  Grid3X3, 
  FileText, 
  Settings,
  ChevronLeft,
  Home,
  Plus,
  Eye,
  ChevronDown
} from "lucide-react";
import { ActiveView } from "./Dashboard";
import { useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  userRole: "admin" | "worker";
}

const sidebarItems = [
  { id: "customers" as ActiveView, label: "Customers", icon: Users, roles: ["admin", "worker"] },
  { id: "add-customer" as ActiveView, label: "Add Customer", icon: UserPlus, roles: ["worker"] },
  { id: "tiles" as ActiveView, label: "Tile Catalog", icon: Grid3X3, roles: ["worker"] },
  { id: "quotations" as ActiveView, label: "Quotations", icon: FileText, roles: ["admin", "worker"] },
  { id: "admin" as ActiveView, label: "Admin Panel", icon: Settings, roles: ["admin"] },
];

export const Sidebar = ({ isOpen, activeView, onViewChange, userRole }: SidebarProps) => {
  const [isRoomsExpanded, setIsRoomsExpanded] = useState(false);
  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
      isOpen ? "w-64" : "w-0 lg:w-16"
    )}>
      <div className="p-4 flex-1">
        <nav className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all duration-200",
                  isActive && "bg-blue-600 hover:bg-blue-700 text-white",
                  !isActive && "text-gray-600 hover:text-gray-800 hover:bg-gray-100",
                  !isOpen && "lg:justify-center lg:px-2"
                )}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0")} />
                {(isOpen) && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Button>
            );
          })}

          {/* Rooms section for workers only */}
          {userRole === "worker" && (
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all duration-200 text-gray-600 hover:text-gray-800 hover:bg-gray-100",
                  !isOpen && "lg:justify-center lg:px-2"
                )}
                onClick={() => setIsRoomsExpanded(!isRoomsExpanded)}
              >
                <Home className="h-5 w-5 flex-shrink-0" />
                {isOpen && (
                  <>
                    <span className="font-medium flex-1">Rooms</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      isRoomsExpanded && "rotate-180"
                    )} />
                  </>
                )}
              </Button>

              {/* Rooms submenu */}
              {isRoomsExpanded && isOpen && (
                <div className="ml-4 space-y-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-10 text-sm transition-all duration-200",
                      activeView === "view-rooms" && "bg-blue-100 text-blue-700",
                      activeView !== "view-rooms" && "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                    )}
                    onClick={() => onViewChange("view-rooms" as ActiveView)}
                  >
                    <Eye className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">View Rooms</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-10 text-sm transition-all duration-200",
                      activeView === "add-room" && "bg-blue-100 text-blue-700",
                      activeView !== "add-room" && "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                    )}
                    onClick={() => onViewChange("add-room" as ActiveView)}
                  >
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">Add Room</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
};

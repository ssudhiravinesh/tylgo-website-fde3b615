
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus, 
  Grid3X3, 
  FileText, 
  Settings,
  ChevronLeft
} from "lucide-react";
import { ActiveView } from "./Dashboard";

interface SidebarProps {
  isOpen: boolean;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  userRole: "admin" | "worker";
}

const sidebarItems = [
  { id: "customers" as ActiveView, label: "Customers", icon: Users, roles: ["admin", "worker"] },
  { id: "add-customer" as ActiveView, label: "Add Customer", icon: UserPlus, roles: ["admin", "worker"] },
  { id: "tiles" as ActiveView, label: "Tile Catalog", icon: Grid3X3, roles: ["admin", "worker"] },
  { id: "quotations" as ActiveView, label: "Quotations", icon: FileText, roles: ["admin", "worker"] },
  { id: "admin" as ActiveView, label: "Admin Panel", icon: Settings, roles: ["admin"] },
];

export const Sidebar = ({ isOpen, activeView, onViewChange, userRole }: SidebarProps) => {
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
        </nav>
      </div>
    </aside>
  );
};

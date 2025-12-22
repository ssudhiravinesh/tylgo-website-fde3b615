import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  Grid3X3,
  FileText,
  Settings,
  Home,
  Package
} from "lucide-react";
import { ActiveView } from "./Dashboard";

interface SidebarProps {
  isOpen: boolean;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  userRole: "admin" | "worker" | "super_admin";
}

const sidebarItems = [
  { id: "customers" as ActiveView, label: "Customers", icon: Users, roles: ["admin", "worker", "super_admin"] },
  { id: "add-customer" as ActiveView, label: "Add Customer", icon: UserPlus, roles: ["worker"] },
  { id: "rooms" as ActiveView, label: "Rooms", icon: Home, roles: ["worker"] },
  { id: "tiles" as ActiveView, label: "Tile Catalog", icon: Grid3X3, roles: ["worker"] },
  { id: "products" as ActiveView, label: "Manage Products", icon: Package, roles: ["admin", "worker", "super_admin"] },
  { id: "manage-tiles" as ActiveView, label: "Manage Tiles", icon: Grid3X3, roles: ["admin", "super_admin"] },
  { id: "quotations" as ActiveView, label: "Quotations", icon: FileText, roles: ["admin", "worker", "super_admin"] },
  { id: "admin" as ActiveView, label: "Admin Panel", icon: Settings, roles: ["admin", "super_admin"] },
];

export const Sidebar = ({ isOpen, activeView, onViewChange, userRole }: SidebarProps) => {
  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
      isOpen ? "w-64" : "w-0 lg:w-16",
      isOpen && "shadow-lg lg:shadow-none"
    )}>
      <div className={cn(
        "p-4 flex-1",
        isOpen && "overflow-visible",
        // Hide content completely on small screens when sidebar is closed
        !isOpen && "hidden lg:block"
      )}>
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

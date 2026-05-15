import { cn } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Grid3X3,
  FileText,
  Settings,
  Home,
  Package,
  ChevronRight,
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
  { id: "add-customer" as ActiveView, label: "Add Customer", icon: UserPlus, roles: ["admin", "worker", "super_admin"] },
  { id: "rooms" as ActiveView, label: "Rooms", icon: Home, roles: ["admin", "worker", "super_admin"] },
  { id: "tiles" as ActiveView, label: "Tile Catalog", icon: Grid3X3, roles: ["admin", "worker", "super_admin"] },
  { id: "products" as ActiveView, label: "Products", icon: Package, roles: ["admin", "worker", "super_admin"] },
  { id: "manage-tiles" as ActiveView, label: "Manage Tiles", icon: Grid3X3, roles: ["admin", "super_admin"] },
  { id: "quotations" as ActiveView, label: "Quotations", icon: FileText, roles: ["admin", "worker", "super_admin"] },
  { id: "admin" as ActiveView, label: "Admin Panel", icon: Settings, roles: ["admin", "super_admin"] },
];

export const Sidebar = ({ isOpen, activeView, onViewChange, userRole }: SidebarProps) => {
  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole));

  return (
    <aside
      className={cn(
        "tylgo-sidebar flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
        isOpen ? "w-56" : "w-0 lg:w-[60px]",
        isOpen && "shadow-xl lg:shadow-none"
      )}
      style={{ position: "relative", zIndex: 1 }}
    >
      {/* Logo area inside sidebar */}
      <div
        className={cn(
          "h-[60px] flex items-center flex-shrink-0 border-b transition-all",
          "border-[hsl(var(--sidebar-border))]",
          isOpen ? "px-4 justify-start" : "px-0 justify-center"
        )}
      >
        <div className="flex items-center gap-2.5">
          <img src="/tylgo-logo.png" alt="Tylgo Logo" className="h-7 w-auto dark:hidden" />
          <img src="/tylgo-logo-dark.png" alt="Tylgo Logo" className="h-7 w-auto hidden dark:block" />
          {isOpen && (
            <span className="font-extrabold text-lg tracking-[-0.02em] text-[hsl(var(--sidebar-foreground-active))]">
              TYLGO
            </span>
          )}
        </div>
      </div>

      {/* Nav items */}
      <div
        className={cn(
          "flex-1 overflow-y-auto py-4 relative z-10 scrollbar-hide",
          isOpen ? "px-3" : "px-0 lg:px-2",
          !isOpen && "hidden lg:block"
        )}
      >
        {isOpen && (
          <p className="section-label mb-3 px-1" style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.45 }}>
            Navigation
          </p>
        )}

        <nav className="space-y-0.5">
          {filteredItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "sidebar-nav-item w-full",
                  isActive && "active",
                  !isOpen && "lg:justify-center lg:px-0 lg:py-2.5"
                )}
                style={{ animationDelay: `${idx * 40}ms` }}
                title={!isOpen ? item.label : undefined}
              >
                <Icon
                  className="sidebar-icon"
                  style={{ color: isActive ? "hsl(var(--sidebar-primary-foreground))" : undefined }}
                />
                {isOpen && (
                  <span className="flex-1 text-left text-[13px]">{item.label}</span>
                )}
                {isOpen && isActive && (
                  <ChevronRight
                    className="h-3.5 w-3.5 opacity-60 flex-shrink-0"
                    style={{ color: "hsl(var(--sidebar-primary-foreground))" }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom brand mark */}
      {isOpen && (
        <div className="relative z-10 px-4 py-3 border-t border-[hsl(var(--sidebar-border))]">
          <p className="text-[11px] font-medium tracking-wide" style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.35 }}>
            ANUJ Tiles · Tylgo v1
          </p>
        </div>
      )}
    </aside>
  );
};

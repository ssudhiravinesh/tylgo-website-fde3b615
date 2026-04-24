import { useState } from "react";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker" | "super_admin";
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

const roleLabel = {
  admin: "Admin",
  worker: "Staff",
  super_admin: "Super Admin",
};

const roleClass = {
  admin: "admin",
  worker: "",
  super_admin: "super_admin",
};

export const Header = ({ user, onLogout, onToggleSidebar }: HeaderProps) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <header className="tylgo-header animate-in-fade">
        {/* Left: toggle + wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Right: user + logout */}
        <div className="flex items-center gap-2">
          {/* User pill */}
          <div className="user-pill gap-2.5">
            {/* Avatar circle */}
            <span
              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {initials}
            </span>
            <span className="text-[13px] font-semibold hidden sm:block">{user.name}</span>
            <span className={`role-badge ${roleClass[user.role]} hidden sm:inline-block`}>
              {roleLabel[user.role]}
            </span>
          </div>

          {/* Logout button */}
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </header>

      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={onLogout}
      />
    </>
  );
};

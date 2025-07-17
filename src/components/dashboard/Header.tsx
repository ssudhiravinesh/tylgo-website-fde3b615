
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, User, LogOut, Building2 } from "lucide-react";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker";
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export const Header = ({ user, onLogout, onToggleSidebar }: HeaderProps) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  return (
    <>
      <header className="glassmorphic-nav sticky top-0 z-40 border-b border-white/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="glass"
              size="sm"
              onClick={onToggleSidebar}
              className="p-2 hover:bg-white/20"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                TYLGO
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 px-4 py-2 glassmorphic rounded-full border border-white/20">
                <User className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">{user.name}</span>
                <Badge variant="secondary" className="text-xs capitalize neumorphic-button">
                  {user.role}
                </Badge>
              </div>
              
              <Button
                variant="glass"
                size="sm"
                onClick={() => setShowLogoutDialog(true)}
                className="gap-2 hover:bg-red-500/20 hover:text-red-500"
              > 
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
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

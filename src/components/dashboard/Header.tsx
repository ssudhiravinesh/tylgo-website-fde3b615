
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, User, LogOut, QrCode } from "lucide-react";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { ContextAwareQRScanner } from "@/components/qr/ContextAwareQRScanner";
import { useQRScanningContext } from "@/contexts/QRScanningContext";

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
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
  const { 
    currentCustomerName, 
    selectedRoomIds, 
    isContextActive 
  } = useQRScanningContext();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-800">Tile Haven</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* QR Context Status */}
            {isContextActive && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full border border-purple-200">
                <QrCode className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-700">
                  {currentCustomerName} • {selectedRoomIds.length} room(s)
                </span>
              </div>
            )}

            {/* Global QR Scanner Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQRScannerOpen(true)}
              className={`gap-2 ${isContextActive ? 'border-purple-500 text-purple-700' : ''}`}
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Scan QR</span>
              {isContextActive && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                  Ready
                </Badge>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {user.role}
                </Badge>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutDialog(true)}
                className="p-2 text-gray-600 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={onLogout}
      />

      <ContextAwareQRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />
    </>
  );
};

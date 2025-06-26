
import { useState } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut();
      setShowLogoutDialog(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // If not authenticated, show login form or redirect
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Tile Haven</h1>
          <p className="text-gray-600">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dashboard user={profile} onLogout={handleLogoutClick} />
      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
};

export default Index;

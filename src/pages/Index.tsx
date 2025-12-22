
import { useState } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuth } from "@/hooks/useAuth";
import { GridLoader } from "@/components/ui/GridLoader";

const Index = () => {
  const { user, profile, signOut, loading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);

  const handleLogoutClick = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return <GridLoader loadingText="Loading..." />;
  }



  // If not authenticated, show login/signup forms
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        {showSignUp ? (
          <SignUpForm onShowLogin={() => setShowSignUp(false)} />
        ) : (
          <LoginForm onShowSignUp={() => setShowSignUp(true)} />
        )}
      </div>
    );
  }

  return (
    <Dashboard user={profile} onLogout={handleLogoutClick} />
  );
};




export default Index;

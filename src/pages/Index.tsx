
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [showSignUp, setShowSignUp] = useState(false);
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        {showSignUp ? (
          <SignUpForm onBackToLogin={() => setShowSignUp(false)} />
        ) : (
          <LoginForm onShowSignUp={() => setShowSignUp(true)} />
        )}
      </div>
    );
  }

  return <Dashboard user={profile} onLogout={signOut} />;
};

export default Index;

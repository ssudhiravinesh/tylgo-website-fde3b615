
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showSignUp, setShowSignUp] = useState(false);
  const { user, profile, loading, signOut } = useAuth();

  console.log("Index render - loading:", loading, "user:", user, "profile:", profile);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-sm text-gray-500 mt-2">If this takes too long, please refresh the page</p>
          <Button 
            onClick={signOut}
            variant="outline"
            className="mt-4"
          >
            Sign Out & Start Fresh
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    console.log("Showing auth forms - user:", !!user, "profile:", !!profile);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        {user && !profile && (
          <div className="mb-4 text-center">
            <Button 
              onClick={signOut}
              variant="outline"
              className="mb-4"
            >
              Sign Out & Start Fresh
            </Button>
          </div>
        )}
        {showSignUp ? (
          <SignUpForm onBackToLogin={() => setShowSignUp(false)} />
        ) : (
          <LoginForm onShowSignUp={() => setShowSignUp(true)} />
        )}
      </div>
    );
  }

  console.log("Showing dashboard for user:", profile.name);
  return <Dashboard user={profile} onLogout={signOut} />;
};

export default Index;

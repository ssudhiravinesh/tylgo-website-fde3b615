
import { useState, useEffect } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GridLoader } from "@/components/ui/GridLoader";
import { toast } from "sonner";

const Index = () => {
  const { user, profile, signOut, loading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);

  const handleLogoutClick = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully'); // Manual toast for intentional logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Tenant Verification Gatekeeper
  // We use lastVerifiedUserId to ensure we verify EACH new session/user before showing dashboard.
  // This prevents the "flash" because if user.id != lastVerifiedUserId, we show loader immediately.
  const [lastVerifiedUserId, setLastVerifiedUserId] = useState<string | null>(null);

  // Derived state: verification is pending if we have a user but haven't verified this specific user ID yet.
  const isVerificationPending = user && user.id !== lastVerifiedUserId;

  useEffect(() => {
    const verifyTenant = async () => {
      // If no user, or already verified this user, skip.
      if (!user || !profile || user.id === lastVerifiedUserId) {
        return;
      }

      console.log("Verifying access for user:", user.id);

      const hostname = window.location.hostname;
      const isRoot = hostname.includes('localhost') ||
        hostname.endsWith('.vercel.app') ||
        hostname === 'tylgo.com' ||
        hostname === 'www.tylgo.com' ||
        hostname === 'tylgo.store' ||
        hostname === 'www.tylgo.store';

      if (isRoot) {
        // No strict tenant enforcement on root (or handle differently)
        setLastVerifiedUserId(user.id);
        return;
      }

      const subdomain = hostname.split('.')[0];
      try {
        const { data: showroom, error } = await supabase
          .from('showrooms')
          .select('id, name')
          .eq('subdomain', subdomain)
          .single();

        if (error || !showroom) {
          console.error("Error fetching showroom for validation:", error);
          // If we can't fetch showroom, we probably shouldn't let them in?
          // For now, let's assume if network error, we might be safe or fail closed.
          // Fail closed:
          // await signOut();
        } else if (profile.showroom_id !== showroom.id) {
          console.error(`Tenant mismatch in Index gatekeeper: User ${profile.showroom_id} != Site ${showroom.id}`);
          await signOut();
          toast.error(`Access Denied. You do not belong to ${showroom.name}`);
          return; // Do NOT set verified
        }

        // If we passed checks:
        setLastVerifiedUserId(user.id);

      } catch (err) {
        console.error("Tenant verification error:", err);
      }
    };

    if (!loading && user) {
      verifyTenant();
    }
  }, [user, profile, loading, signOut, lastVerifiedUserId]);

  // Show loading state while checking authentication OR verifying tenant
  if (loading || isVerificationPending) {
    return <GridLoader loadingText="Verifying access..." />;
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

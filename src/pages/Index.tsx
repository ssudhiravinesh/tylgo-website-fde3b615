
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
  const [isVerifying, setIsVerifying] = useState(true);
  // supabase is imported directly now.

  useEffect(() => {
    const verifyTenant = async () => {
      if (!user || !profile) {
        setIsVerifying(false);
        return;
      }

      const hostname = window.location.hostname;
      const isRoot = hostname.includes('localhost') ||
        hostname.endsWith('.vercel.app') ||
        hostname === 'tylgo.com' ||
        hostname === 'www.tylgo.com' ||
        hostname === 'tylgo.store' ||
        hostname === 'www.tylgo.store';

      if (isRoot) {
        setIsVerifying(false);
        return;
      }

      const subdomain = hostname.split('.')[0];
      try {
        // We need to import supabase client here or use from hook if available. 
        // Index.tsx imports: import { supabase } from "@/integrations/supabase/client"; (Needed)
        const { data: showroom, error } = await supabase
          .from('showrooms')
          .select('id, name')
          .eq('subdomain', subdomain)
          .single();

        if (showroom && profile.showroom_id !== showroom.id) {
          console.error(`Tenant mismatch in Index gatekeeper: User ${profile.showroom_id} != Site ${showroom.id}`);
          await signOut();
          // Optional: Toast is handled by signOut usually or we can add one here
        }
      } catch (err) {
        console.error("Tenant verification error:", err);
      } finally {
        setIsVerifying(false);
      }
    };

    if (!loading) {
      verifyTenant();
    }
  }, [user, profile, loading, signOut]);

  // Show loading state while checking authentication OR verifying tenant
  if (loading || (user && isVerifying)) {
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

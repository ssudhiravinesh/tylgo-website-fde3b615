import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Loader2, Building2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorUtils";

interface LoginFormProps {
  onShowSignUp: () => void;
  onSuccessfulLogin?: (userId: string) => Promise<void>;
}

/** Google "G" logo as inline SVG for the sign-in button */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" className="mr-2 flex-shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export const LoginForm = ({ onShowSignUp, onSuccessfulLogin }: LoginFormProps) => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showroomName, setShowroomName] = useState<string | null>(null);
  const { signIn, signInWithGoogle } = useAuth();

  const [subdomainShowroomId, setSubdomainShowroomId] = useState<string | null>(null);

  useEffect(() => {
    const checkSubdomain = async () => {
      const hostname = window.location.hostname;
      const isRoot =
        hostname.includes("localhost") ||
        hostname.endsWith(".vercel.app") ||
        hostname === "tylgo.com" ||
        hostname === "www.tylgo.com" ||
        hostname === "tylgo.store" ||
        hostname === "www.tylgo.store";

      if (!isRoot) {
        const subdomain = hostname.split(".")[0];
        try {
          const { data, error } = await supabase
            .from("showrooms")
            .select("id, name")
            .eq("subdomain", subdomain)
            .single();

          if (!error && data) {
            setShowroomName(data.name);
            setSubdomainShowroomId(data.id);
          }
        } catch (err) {
          console.error("Subdomain lookup error:", err);
        }
      }
    };
    checkSubdomain();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await signIn(emailOrUsername, password);

      if (result?.user) {
        if (subdomainShowroomId) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("showroom_id")
            .eq("id", result.user.id)
            .single();

          if (profileError) throw new Error("Failed to verify account permissions.");

          if (profile?.showroom_id !== subdomainShowroomId) {
            await supabase.auth.signOut();
            throw new Error("Access Denied. You do not belong to this showroom.");
          }
        }

        if (onSuccessfulLogin) await onSuccessfulLogin(result.user.id);
        toast.success("Welcome back.");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Login failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Browser will redirect to Google — no need to reset loading
    } catch (error: unknown) {
      setIsGoogleLoading(false);
      toast.error(getErrorMessage(error, "Google sign-in failed"));
    }
  };

  return (
    <div className="login-card p-8 animate-in-up">
      {/* Header */}
      <div className="mb-8">
        {/* Wordmark */}
        <div className="mb-6 flex items-center gap-3">
          <img src="/tylgo-logo.png" alt="Tylgo Logo" className="h-10 w-auto dark:hidden drop-shadow-sm" />
          <img src="/tylgo-logo-dark.png" alt="Tylgo Logo" className="h-10 w-auto hidden dark:block drop-shadow-sm" />
          <span className="font-extrabold text-2xl tracking-[-0.02em]">
            TYLGO
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-1">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          {showroomName ? (
            <>
              <Building2 className="inline h-3.5 w-3.5 mr-1 opacity-60" />
              <span className="font-semibold text-foreground">{showroomName}</span>
              <span className="ml-1">showroom portal</span>
            </>
          ) : (
            "Enter your credentials to access the dashboard."
          )}
        </p>
      </div>

      {/* Google OAuth Button — Primary action */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isSubmitting}
        className="w-full h-11 flex items-center justify-center rounded-md border border-border bg-card text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/30 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mb-2"
      >
        {isGoogleLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            <GoogleIcon />
            Continue with Google
          </>
        )}
      </button>

      {/* Divider */}
      <div className="craft-divider">or sign in with credentials</div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="emailOrUsername" className="text-[13px] font-semibold">
            Username or Email
          </Label>
          <div className="relative">
            <User
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Input
              id="emailOrUsername"
              type="text"
              placeholder="john.doe or you@example.com"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="pl-9 h-11 text-sm font-medium border-border focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              required
              disabled={isSubmitting}
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[13px] font-semibold">
            Password
          </Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 h-11 text-sm font-medium border-border focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              required
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary-craft w-full h-11 mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Footer note */}
      <div className="craft-divider mt-6">system access</div>
      <p className="text-center text-xs text-muted-foreground">
        For account access, contact your{" "}
        <span className="font-semibold text-foreground">showroom administrator</span>.
      </p>
    </div>
  );
};
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorUtils";

interface LoginFormProps {
  onShowSignUp: () => void;
  onSuccessfulLogin?: (userId: string) => Promise<void>;
}

export const LoginForm = ({ onShowSignUp, onSuccessfulLogin }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showroomName, setShowroomName] = useState<string | null>(null);
  const { signIn } = useAuth();

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
      const result = await signIn(email, password);

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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px] font-semibold">
            Email address
          </Label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-11 text-sm font-medium border-border focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              required
              disabled={isSubmitting}
              autoComplete="email"
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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, Mail, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner"; // Make sure you have this import

interface LoginFormProps {
  onShowSignUp: () => void;
  onSuccessfulLogin?: (userId: string) => Promise<void>; // Add this prop
}

export const LoginForm = ({ onShowSignUp, onSuccessfulLogin }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showroomName, setShowroomName] = useState<string | null>(null);
  const { signIn } = useAuth();

  // Debounce email changes to look up showroom
  useEffect(() => {
    const lookupShowroom = async () => {
      if (!email || !email.includes('@')) {
        // Only reset if we're not on a subdomain that already set the name
        const hostname = window.location.hostname;
        const isRoot = hostname.includes('localhost') ||
          hostname.endsWith('.vercel.app') ||
          hostname === 'tylgo.com' ||
          hostname === 'www.tylgo.com' ||
          hostname === 'tylgo.store' ||
          hostname === 'www.tylgo.store';

        if (isRoot) {
          setShowroomName(null);
        }
        return;
      }

      try {
        console.log('Looking up showroom for:', email);
        // Cast the RPC name to any to suppress type error until types are regenerated
        const { data, error } = await supabase.rpc('get_showroom_details_by_email' as any, {
          lookup_email: email
        });

        if (error) {
          console.error('Error looking up showroom:', error);
          // Don't reset if we are on a known subdomain? 
          // Actually, if email lookup fails, we might want to keep the subdomain-based name if available,
          // but usually email lookup is for finding *user's* specific showroom if different? 
          // For now, let's play safe and not aggressive reset if we have a subdomain context, 
          // but the original logic was to reset. 
          // Let's stick to original logic of resetting or setting based on email unless email is empty.
          // If email is provided but invalid/no result, maybe we should fall back to subdomain name?
          // Simpler: Just update if data found.
          return;
        }

        console.log('Showroom lookup result:', data);

        // Cast data to expected type
        const showrooms = data as { showroom_name: string }[] | null;

        if (showrooms && showrooms.length > 0) {
          setShowroomName(showrooms[0].showroom_name);
        } else {
          // If email doesn't match, maybe revert to subdomain name?
          // For now, explicit email match takes precedence or nulls it.
          setShowroomName(null);
        }
      } catch (err) {
        console.error('Showroom lookup error:', err);
        setShowroomName(null);
      }
    };

    const timeoutId = setTimeout(lookupShowroom, 500);
    return () => clearTimeout(timeoutId);
  }, [email]);

  // State to store the showroom ID associated with the current subdomain
  const [subdomainShowroomId, setSubdomainShowroomId] = useState<string | null>(null);

  // Check for subdomain on mount
  useEffect(() => {
    const checkSubdomain = async () => {
      const hostname = window.location.hostname;
      const isRoot = hostname.includes('localhost') ||
        hostname.endsWith('.vercel.app') ||
        hostname === 'tylgo.com' ||
        hostname === 'www.tylgo.com' ||
        hostname === 'tylgo.store' ||
        hostname === 'www.tylgo.store';

      if (!isRoot) {
        // We are on a subdomain (e.g. anuj.tylgo.store)
        const subdomain = hostname.split('.')[0];
        console.log('Detected subdomain:', subdomain);

        try {
          // Attempt to fetch showroom details by subdomain
          const { data, error } = await supabase
            .from('showrooms')
            .select('id, name')
            .eq('subdomain', subdomain)
            .single();

          if (error) {
            console.error('Error fetching showroom by subdomain:', error);
          } else if (data) {
            setShowroomName(data.name);
            setSubdomainShowroomId(data.id);
          }
        } catch (err) {
          console.error('Subdomain lookup error:', err);
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
      // 1. Perform Authentication
      const result = await signIn(email, password);

      if (result?.user) {
        // 2. Tenant Enforcement Logic
        if (subdomainShowroomId) {
          console.log('Verifying tenant access for showroom:', subdomainShowroomId);

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('showroom_id')
            .eq('id', result.user.id)
            .single();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            throw new Error('Failed to verify account permissions.');
          }

          if (profile?.showroom_id !== subdomainShowroomId) {
            console.warn(`Tenant mismatch: User ${profile?.showroom_id} != Site ${subdomainShowroomId}`);

            // Sign out immediately
            await supabase.auth.signOut();

            throw new Error(`Access Denied. This account does not belong to ${showroomName || 'this showroom'}.`);
          }
        }

        // 3. Success - Proceed
        if (onSuccessfulLogin) {
          await onSuccessfulLogin(result.user.id);
        }

        toast.success('Login successful!');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="flex flex-col items-center pb-4">
        <img src="/tylgo.svg" className="w-8 h-8 mb-2" />
        <CardTitle className="text-2xl font-bold text-gray-800">
          TYL
          <span style={{ color: "#2563eb", fontWeight: "bold" }}>G</span>
          O
        </CardTitle>
        <CardDescription className="text-gray-600 text-center">
          {showroomName ? (
            <span className="font-medium text-blue-600 block mt-1 text-base">
              {showroomName}
            </span>
          ) : (
            "Sign in to your account to continue"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              For admin access, contact your system administrator
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
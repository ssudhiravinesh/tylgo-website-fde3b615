import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, Mail, User, Loader2, ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SignUpFormProps {
  onShowLogin: () => void;
}

export const SignUpForm = ({ onShowLogin }: SignUpFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminCreation, setShowAdminCreation] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await signUp(email, password, name, 'admin');
      // Success toast is handled in useAuth
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Regular sign up form (for workers - but this should normally not be accessible)
  if (!showAdminCreation) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4">
            <img src="/tylgo-logo.png" alt="Tylgo Logo" className="w-16 h-16 mx-auto dark:hidden drop-shadow-sm" />
            <img src="/tylgo-logo-dark.png" alt="Tylgo Logo" className="w-16 h-16 mx-auto hidden dark:block drop-shadow-sm" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground tracking-[-0.02em]">TYLGO</CardTitle>
          <CardDescription className="text-muted-foreground">
            Worker Registration
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-muted-foreground/70" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Account Creation Restricted</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Worker accounts can only be created by system administrators through the admin panel.
              </p>
              <p className="text-xs text-muted-foreground">
                Please contact your system administrator for account access.
              </p>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            <Button 
              onClick={onShowLogin}
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
            
            {/* Admin creation is now secure - only available through admin panel */}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin creation form
  return (
    <Card className="w-full max-w-md shadow-2xl border-0 bg-card/90 backdrop-blur-sm">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">Create Admin Account</CardTitle>
        <CardDescription className="text-muted-foreground">
          Set up the first administrator account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground/80">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-12 border-border focus:border-amber-500 focus:ring-amber-500"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 border-border focus:border-amber-500 focus:ring-amber-500"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 border-border focus:border-amber-500 focus:ring-amber-500"
                required
                disabled={isSubmitting}
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12 border-border focus:border-amber-500 focus:ring-amber-500"
                required
                disabled={isSubmitting}
                minLength={6}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSubmit}
            className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Admin Account...
              </>
            ) : (
              "Create Admin Account"
            )}
          </Button>
        </div>
        
        <div className="mt-6 space-y-3">
          <Button 
            onClick={() => setShowAdminCreation(false)}
            variant="outline" 
            className="w-full"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button 
            onClick={onShowLogin}
            variant="ghost" 
            className="w-full text-sm"
            disabled={isSubmitting}
          >
            Already have an account? Sign In
          </Button>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Important:</strong> Remove the "Create First Admin Account" button from the signup form after creating your first administrator account.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
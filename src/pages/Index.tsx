
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Dashboard } from "@/components/dashboard/Dashboard";

// Mock user for demo - in real app this would come from auth context
const mockUser = {
  id: "1",
  name: "John Doe",
  email: "john@tilehaven.com",
  role: "admin" as "admin" | "worker"
};

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<typeof mockUser | null>(null);

  const handleLogin = (email: string, password: string) => {
    // Mock authentication - in real app this would call Supabase
    console.log("Login attempt:", { email, password });
    setUser(mockUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return <Dashboard user={user!} onLogout={handleLogout} />;
};

export default Index;

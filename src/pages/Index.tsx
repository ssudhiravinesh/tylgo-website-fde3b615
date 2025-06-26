
import { Dashboard } from "@/components/dashboard/Dashboard";

const Index = () => {
  // Mock user data for now - in a real app this would come from authentication
  const mockUser = {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin" as const
  };

  const handleLogout = () => {
    console.log("Logout function called");
    // In a real app, this would handle the logout process
  };

  return <Dashboard user={mockUser} onLogout={handleLogout} />;
};

export default Index;

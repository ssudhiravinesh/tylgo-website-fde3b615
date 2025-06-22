
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, LogOut, Menu } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker";
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export const Header = ({ user, onLogout, onToggleSidebar }: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Tile Haven</h1>
            <p className="text-xs text-gray-500">Business Management System</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize">
            {user.role}
          </Badge>
        </div>
        
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
            {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="text-gray-600 hover:text-red-600 hover:border-red-200"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Logout</span>
        </Button>
      </div>
    </header>
  );
};


export type ActiveView = 
  | "customers" 
  | "add-customer" 
  | "tiles" 
  | "quotations" 
  | "add-quotation"
  | "edit-quotation"
  | "view-quotation"
  | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker";
}

export interface DashboardProps {
  user: User;
  onLogout: () => void;
}

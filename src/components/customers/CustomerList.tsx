
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Phone, MapPin, Calendar, User } from "lucide-react";

interface CustomerListProps {
  onAddCustomer: () => void;
  userRole: "admin" | "worker";
}

// Mock data - in real app this would come from database
const mockCustomers = [
  {
    id: "1",
    name: "Rajesh Kumar",
    mobile: "+91 98765 43210",
    address: "123 MG Road, Bangalore",
    attendedBy: "John Doe",
    createdAt: "2024-01-15",
    quotationsCount: 3
  },
  {
    id: "2",
    name: "Priya Sharma",
    mobile: "+91 87654 32109",
    address: "456 Park Street, Mumbai",
    attendedBy: "Jane Smith", 
    createdAt: "2024-01-20",
    quotationsCount: 1
  },
  {
    id: "3",
    name: "Mohammed Ali",
    mobile: "+91 76543 21098",
    address: "789 Brigade Road, Chennai",
    attendedBy: "John Doe",
    createdAt: "2024-01-25",
    quotationsCount: 2
  }
];

export const CustomerList = ({ onAddCustomer, userRole }: CustomerListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.includes(searchTerm) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
          <p className="text-gray-600">Manage your customer database and quotations</p>
        </div>
        
        <Button
          onClick={onAddCustomer}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search customers by name, mobile, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-lg transition-shadow duration-200 border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  {customer.name}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {customer.quotationsCount} quotes
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-green-600" />
                {customer.mobile}
              </div>
              
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{customer.address}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                Added {new Date(customer.createdAt).toLocaleDateString()}
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Attended by: <span className="font-medium text-gray-700">{customer.attendedBy}</span>
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs">
                  View Details
                </Button>
                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  New Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No customers found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first customer"}
          </p>
          {!searchTerm && (
            <Button onClick={onAddCustomer} className="bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Your First Customer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

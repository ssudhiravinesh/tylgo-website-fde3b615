import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Search,
  Phone,
  MapPin,
  Calendar,
  User,
  Eye,
  FileText,
} from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { CustomerDetails } from "./CustomerDetails";
import type { Customer } from "@/hooks/useCustomers";

interface CustomerListProps {
  onAddCustomer: () => void;
  onNewQuote: (customerId: string) => void;
  userRole: "admin" | "worker";
}

export const CustomerList = ({ onAddCustomer, onNewQuote, userRole }: CustomerListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const { data: customers = [], isLoading } = useCustomers();

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.includes(searchTerm) ||
    customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (customer: Customer) => setSelectedCustomer(customer);
  const handleBackToList = () => setSelectedCustomer(null);

  if (selectedCustomer) {
    return <CustomerDetails customer={selectedCustomer} onBack={handleBackToList} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with styled dropdown and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
          <p className="text-gray-600">Manage your customer database and quotations</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {viewMode === 'list' ? 'List View' : 'Card View'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewMode('list')}>List View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('card')}>Card View</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {userRole === 'worker' && (
            <Button onClick={onAddCustomer} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <UserPlus className="h-4 w-4" /> Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search customers by name, mobile, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* List or Card view */}
      {viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" /> {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{customer.mobile}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 line-clamp-1">
                    {customer.address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(customer)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {userRole === 'worker' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <FileText className="h-4 w-4 mr-1" /> Quote
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow duration-200 border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    {customer.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">New</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-green-600" /> {customer.mobile}
                </div>
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                    <span className="line-clamp-2">{customer.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" /> {new Date(customer.created_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewDetails(customer)}>
                    <Eye className="h-3 w-3 mr-1" /> View Details
                  </Button>
                  {userRole === 'worker' && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => onNewQuote(customer.id)}>
                      <FileText className="h-3 w-3 mr-1" /> New Quote
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No customers found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first customer"}
          </p>
          {!searchTerm && userRole === 'worker' && (
            <Button onClick={onAddCustomer} className="bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" /> Add Your First Customer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

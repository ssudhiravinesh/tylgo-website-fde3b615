import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  UserPlus,
  Search,
  Phone,
  MapPin,
  Calendar,
  User,
  Eye,
  FileText,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { CustomerDetails } from "./CustomerDetails";
import type { Customer } from "@/hooks/useCustomers";

interface CustomerListProps {
  onAddCustomer: () => void;
  onNewQuote: (customerId: string) => void;
  userRole: "admin" | "worker" | "super_admin";
}

export const CustomerList = ({ onAddCustomer, onNewQuote, userRole }: CustomerListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const { data: customers = [], isLoading } = useCustomers();
  const styles = {
    tilesContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 20px)',
      gridTemplateRows: 'repeat(3, 20px)',
      gap: '8px',
      justifyContent: 'center',
      marginBottom: '24px',
    },
    tile: {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      animation: 'tileAnimation 1.2s ease-in-out infinite',
    },
    tileBlue: {
      backgroundColor: '#3B82F6',
    },
    tileBeige: {
      backgroundColor: '#F5F5DC',
    },
    tileLight: {
      backgroundColor: '#93C5FD',
    },
    loadingText: {
      color: '#6B7280',
      fontSize: '16px',
      fontWeight: '500',
      marginBottom: '16px',
    },
    progressBar: {
      width: '200px',
      height: '4px',
      backgroundColor: '#E5E7EB',
      borderRadius: '2px',
      overflow: 'hidden',
      margin: '0 auto',
    },
    progressFill: {
      height: '100%',
      width: '100%',
      background: 'linear-gradient(90deg, #3B82F6, #93C5FD, #3B82F6)',
      backgroundSize: '200% 100%',
      animation: 'progressFlow 2s linear infinite',
    },
  };

  // Add keyframe animations using a style tag
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
  @keyframes tileAnimation {
    0%, 80%, 100% {
      transform: scale(1) rotate(0deg);
      opacity: 0.7;
    }
    40% {
      transform: scale(1.2) rotate(180deg);
      opacity: 1;
    }
  }
  
  @keyframes progressFlow {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;
  document.head.appendChild(styleSheet);
  const uniqueAreas = useMemo(
    () => Array.from(new Set(customers.map(c => c.area).filter(Boolean))),
    [customers]
  );
  const uniqueStates = useMemo(
    () => Array.from(new Set(customers.map(c => c.state).filter(Boolean))),
    [customers]
  );
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.mobile.includes(searchTerm)
      )
      .filter(c => !areaFilter || c.area?.toLowerCase().includes(areaFilter.toLowerCase()))
      .filter(c => stateFilter === "all" || c.state === stateFilter)
      .filter(c => categoryFilter === "all" || c.category === categoryFilter);
  }, [customers, searchTerm, areaFilter, stateFilter, categoryFilter]);

  // Helper function to format address
  const formatAddress = (customer: Customer) => {
    const addressParts = [
      customer.address,
      customer.area,
      customer.state,
      customer.pincode
    ].filter(Boolean);

    return addressParts.length > 0 ? addressParts.join(", ") : "-";
  };

  const handleViewDetails = (customer: Customer) => setSelectedCustomer(customer);
  const handleBackToList = () => setSelectedCustomer(null);

  if (selectedCustomer) {
    return <CustomerDetails customer={selectedCustomer} onBack={handleBackToList} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          {/* Tile Loading Animation */}
          <div style={styles.tilesContainer}>
            {[...Array(12)].map((_, index) => (
              <div
                key={index}
                style={{
                  ...styles.tile,
                  ...styles[`tile${index % 3 === 0 ? 'Blue' : index % 3 === 1 ? 'Beige' : 'Light'}`],
                  animationDelay: `${index * 0.08}s`
                }}
              />
            ))}
          </div>

          <p style={styles.loadingText}>Loading...</p>

          <div style={styles.progressBar}>
            <div style={styles.progressFill}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with view toggle and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
          <p className="text-gray-600">Manage your customer database and quotations</p>
        </div>
        <div className="flex items-center gap-3">

          <div className="flex items-center space-x-2">
            {/* Category select */}
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v)}
            >
              <SelectTrigger className="h-10 w-32 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="max-h-48 overflow-auto">
                <SelectItem value="all">Categories</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="Builder">Builder</SelectItem>
                <SelectItem value="Engineer">Engineer</SelectItem>
                <SelectItem value="Layer">Layer</SelectItem>
                <SelectItem value="Architect">Architect</SelectItem>
                <SelectItem value="Contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>

            {/* Area autocomplete via datalist */}
            <div className="relative">
              <Input
                placeholder="Filter by area…"
                list="area-list"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="h-10 w-36 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
              <datalist id="area-list">
                {uniqueAreas.map(a => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>

            {/* State select */}
            <Select
              value={stateFilter}
              onValueChange={(v) => setStateFilter(v)}
            >
              <SelectTrigger className="h-10 w-32 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent className="max-h-48 overflow-auto">
                <SelectItem value="all">States</SelectItem>
                {uniqueStates.map(s => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-4">
            {/* List view icon */}
            <button
              onClick={() => setViewMode('list')}
              className={
                `flex items-center gap-1 px-3 py-2 rounded-md transition-colors ` +
                (viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
            >
              <LayoutList className="h-5 w-5" />
              <span className="text-sm">List</span>
            </button>

            {/* Card view icon */}
            <button
              onClick={() => setViewMode('card')}
              className={
                `flex items-center gap-1 px-3 py-2 rounded-md transition-colors ` +
                (viewMode === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
            >
              <LayoutGrid className="h-5 w-5" />
              <span className="text-sm">Card</span>
            </button>
          </div>

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
          placeholder="Search customers by name or mobile..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <Badge variant="outline" className="text-xs">
                      {customer.category || 'Customer'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{customer.mobile}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="max-w-xs truncate" title={formatAddress(customer)}>
                      {formatAddress(customer)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(customer)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {userRole === 'worker' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onNewQuote(customer.id)}>
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
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                  <span className="line-clamp-2">
                    {formatAddress(customer)}
                  </span>
                </div>
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

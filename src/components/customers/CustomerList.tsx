import { useState, useEffect, useMemo } from "react";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { GridLoader } from "@/components/ui/GridLoader";
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
  User,
  Eye,
  FileText,
  LayoutList,
  LayoutGrid,
  Filter,
} from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { CustomerDetails } from "./CustomerDetails";
import type { Customer } from "@/hooks/useCustomers";

interface CustomerListProps {
  onAddCustomer: () => void;
  onNewQuote: (customerId: string) => void;
  userRole: "admin" | "worker" | "super_admin";
  showroomId?: string;
}

export const CustomerList = ({ onAddCustomer, onNewQuote, userRole, showroomId }: CustomerListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { data: customers = [], isLoading } = useCustomers(showroomId);

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
      .filter(c => stateFilter === "all" || c.state === stateFilter);
  }, [customers, searchTerm, areaFilter, stateFilter]);

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
    return <GridLoader loadingText="Loading..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with view toggle and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex justify-between items-center w-full sm:w-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base hidden lg:block">Manage your customer database and quotations</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden flex-shrink-0 ml-4"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            aria-label="Toggle filters"
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">

          {/* Filters & View Modes - Collapsible on mobile */}
          <div className={`flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto ${showMobileFilters ? 'flex' : 'hidden sm:flex'}`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* Area autocomplete via datalist */}
              <div className="relative flex-1 sm:flex-none">
                <Input
                  placeholder="Filter by area…"
                  list="area-list"
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="h-10 w-full sm:w-48 text-sm border-border focus:border-primary focus:ring-primary"
                />
                <datalist id="area-list">
                  {uniqueAreas.map(a => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>

              {/* State select */}
              <div className="flex-1 sm:flex-none">
                <Select
                  value={stateFilter}
                  onValueChange={(v) => setStateFilter(v)}
                >
                  <SelectTrigger className="h-10 w-full sm:w-40 text-sm border-border focus:border-primary focus:ring-primary">
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
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center space-x-2">
                {/* List view icon */}
                <button
                  onClick={() => setViewMode('list')}
                  className={
                    `flex items-center gap-1 px-3 py-2 rounded-md transition-colors ` +
                    (viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-secondary')
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
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-secondary')
                  }
                >
                  <LayoutGrid className="h-5 w-5" />
                  <span className="text-sm">Card</span>
                </button>
              </div>
            </div>
          </div>

          {userRole !== 'super_admin' && (
            <Button onClick={onAddCustomer} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white gap-2">
              <UserPlus className="h-4 w-4" /> Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Search customers by name or mobile..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 border-border focus:border-primary focus:ring-primary"
        />
      </div>

      {/* List or Card view */}
      {viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className="hover:bg-muted cursor-pointer"
                  onClick={() => userRole !== 'super_admin' && onNewQuote(customer.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                    {customer.name}
                    {customer.created_at && differenceInDays(new Date(), new Date(customer.created_at)) <= 5 && (
                      <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 font-normal">New</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">{customer.mobile}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
                    <div className="max-w-md truncate" title={formatAddress(customer)}>
                      {formatAddress(customer)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(customer);
                      }}
                    >
                      <Eye className="h-4 w-4 lg:mr-1" /> <span className="hidden lg:inline">View</span>
                    </Button>
                    {userRole !== 'super_admin' && (
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-white" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewQuote(customer.id);
                        }}
                      >
                        <FileText className="h-4 w-4 lg:mr-1" /> <span className="hidden lg:inline">Quote</span>
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
            <Card 
              key={customer.id} 
              className="content-card cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => userRole !== 'super_admin' && onNewQuote(customer.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {customer.name}
                  </CardTitle>
                  {customer.created_at && differenceInDays(new Date(), new Date(customer.created_at)) <= 5 && (
                    <Badge variant="outline" className="text-xs">New</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex justify-between items-start gap-4">
                <div className="space-y-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary" /> {customer.mobile}
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">
                      {formatAddress(customer)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(customer);
                    }}
                    className="h-8 px-2"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> 
                    <span className="text-xs">View</span>
                  </Button>
                  {userRole !== 'super_admin' && (
                    <Button 
                      size="sm" 
                      className="bg-primary hover:bg-primary/90 text-white h-8 px-2" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewQuote(customer.id);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> 
                      <span className="text-xs">Quote</span>
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
          <User className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No customers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first customer"}
          </p>
          {!searchTerm && userRole !== 'super_admin' && (
            <Button onClick={onAddCustomer} className="bg-primary hover:bg-primary/90 text-white">
              <UserPlus className="h-4 w-4 mr-2" /> Add Your First Customer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

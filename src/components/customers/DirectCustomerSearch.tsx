import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Phone, Search, X } from "lucide-react";
import { useCustomers, Customer } from "@/hooks/useCustomers";

interface DirectCustomerSearchProps {
  value: string;
  onValueChange: (customerName: string) => void;
  onMobileChange: (mobile: string) => void;
  placeholder?: string;
}

export const DirectCustomerSearch = ({ 
  value, 
  onValueChange, 
  onMobileChange, 
  placeholder = "Search customers..." 
}: DirectCustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { data: customers = [] } = useCustomers();

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    searchTerm.length > 0 && (
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mobile.includes(searchTerm)
    )
  ).slice(0, 5); // Limit to 5 results

  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setShowResults(newSearchTerm.length > 0);
    
    // If user clears search and we had a selected customer, clear it
    if (!newSearchTerm && selectedCustomer) {
      setSelectedCustomer(null);
      onValueChange("");
      onMobileChange("");
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm("");
    setShowResults(false);
    onValueChange(customer.name);
    onMobileChange(customer.mobile);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchTerm("");
    setShowResults(false);
    onValueChange("");
    onMobileChange("");
  };

  // Show results when search term changes
  useEffect(() => {
    if (searchTerm.length > 0) {
      setShowResults(true);
    }
  }, [searchTerm]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResults(false);
    };

    if (showResults) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showResults]);

  // If a customer is selected, show their details
  if (selectedCustomer) {
    return (
      <div className="relative">
        <div className="flex items-center justify-between p-3 border border-border rounded-md bg-primary/10">
          <div className="flex items-center gap-2">
            <div>
              <p className="font-medium text-sm text-foreground">{selectedCustomer.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {selectedCustomer.mobile}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            className="h-7 px-2 text-xs"
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-12 border-border"
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSearchChange("")}
            className="absolute right-2 top-2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredCustomers.length > 0 ? (
            <div className="py-1">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">
                        {customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.mobile}
                        {customer.category && customer.category !== 'Customer' && (
                          <span className="text-primary font-medium">• {customer.category}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No customers found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
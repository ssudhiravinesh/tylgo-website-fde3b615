import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, MapPin, Search } from "lucide-react";
import { GridLoader } from "@/components/ui/GridLoader";
import { useCustomers, Customer } from "@/hooks/useCustomers";

interface DirectCustomerSearchProps {
  value: string;
  onValueChange: (customerId: string) => void;
  placeholder?: string;
}

export const DirectCustomerSearch = ({ value, onValueChange, placeholder = "Search customers by name, mobile, or address..." }: DirectCustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { data: customers = [], isLoading } = useCustomers();

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedCustomer = customers.find(customer => customer.id === value);

  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setShowResults(newSearchTerm.length > 0);
  };

  const handleSelectCustomer = (customer: Customer) => {
    onValueChange(customer.id);
    setSearchTerm("");
    setShowResults(false);
  };

  const handleClearSelection = () => {
    onValueChange("");
    setSearchTerm("");
    setShowResults(false);
  };

  // Show results when typing
  useEffect(() => {
    if (searchTerm.length > 0) {
      setShowResults(true);
    }
  }, [searchTerm]);

  return (
    <div className="relative w-full">
      {/* Display selected customer or search input */}
      {selectedCustomer && !showResults ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium text-foreground">{selectedCustomer.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {selectedCustomer.mobile}
                </span>
                {selectedCustomer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedCustomer.address}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            className="text-muted-foreground/70 hover:text-muted-foreground text-sm px-2 py-1 rounded hover:bg-card"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 h-12"
              autoFocus={!selectedCustomer}
            />
          </div>

          {/* Search Results */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-80 overflow-auto bg-card border border-border rounded-lg shadow-lg">
              {isLoading ? (
                <GridLoader className="py-4 min-h-0" loadingText="Loading customers..." />
              ) : filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No customers found matching "{searchTerm}"
                </div>
              ) : (
                <div className="py-2">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{customer.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1 mb-1">
                              <Phone className="h-3 w-3 text-primary" />
                              <span>{customer.mobile}</span>
                            </div>
                            {customer.address && (
                              <div className="flex items-start gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2">{customer.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

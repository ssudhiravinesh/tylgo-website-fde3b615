import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Phone } from "lucide-react";
import { useCustomers, Customer } from "@/hooks/useCustomers";

interface ReferenceNameSearchProps {
  value: string;
  onValueChange: (customerName: string) => void;
  onMobileChange: (mobile: string) => void;
  placeholder?: string;
}

const capitalizeWords = (value: string) => {
  return value
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const ReferenceNameSearch = ({ 
  value, 
  onValueChange, 
  onMobileChange, 
  placeholder = "Enter reference name..." 
}: ReferenceNameSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { data: customers = [], isLoading } = useCustomers();

  // Filter customers based on search term - match name exactly like DirectCustomerSearch
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.includes(searchTerm.replace(/\D/g, ''))
  );

  // Find if current value matches an existing customer
  const selectedCustomer = customers.find(customer => 
    customer.name.toLowerCase() === value.toLowerCase()
  );

  // Initialize with current value
  useEffect(() => {
    if (value && !selectedCustomer) {
      setSearchTerm(value);
    }
  }, [value, selectedCustomer]);

  const handleSearchChange = (newSearchTerm: string) => {
    // Auto-capitalize as user types
    const capitalizedTerm = capitalizeWords(newSearchTerm);
    setSearchTerm(capitalizedTerm);
    onValueChange(capitalizedTerm);
    
    // Show results when typing - same logic as DirectCustomerSearch
    setShowResults(capitalizedTerm.length > 0);
    
    // Clear mobile when manually typing
    if (!selectedCustomer || selectedCustomer.name.toLowerCase() !== capitalizedTerm.toLowerCase()) {
      onMobileChange("");
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    const capitalizedName = capitalizeWords(customer.name);
    setSearchTerm("");
    setShowResults(false);
    onValueChange(capitalizedName);
    onMobileChange(customer.mobile);
  };

  const handleClearSelection = () => {
    setSearchTerm("");
    setShowResults(false);
    onValueChange("");
    onMobileChange("");
  };

  // Show results when typing - same logic as DirectCustomerSearch
  useEffect(() => {
    if (searchTerm.length > 0) {
      setShowResults(true);
    }
  }, [searchTerm]);

  return (
    <div className="relative w-full">
      {/* Display selected customer or search input */}
      {selectedCustomer && !showResults ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
              <div className="text-sm text-gray-600 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {selectedCustomer.mobile}
              </div>
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded hover:bg-white"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Search Results */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-80 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <div className="mt-2">Loading customers...</div>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No customers found matching "{searchTerm}"
                </div>
              ) : (
                <div className="py-2">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-green-600" />
                              <span>{customer.mobile}</span>
                            </div>
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
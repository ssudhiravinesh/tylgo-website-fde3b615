import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, User } from "lucide-react";
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: customers = [], isLoading } = useCustomers();

  // Filter customers based on search term (only show if there are matches)
  const filteredCustomers = searchTerm.length >= 2 ? customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.includes(searchTerm.replace(/\D/g, ''))
  ) : [];

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
    
    // Clear selected customer when manually typing
    if (selectedCustomer) {
      setSelectedCustomer(null);
      onMobileChange("");
    }
    
    // Calculate filtered customers for the new search term
    const newFilteredCustomers = capitalizedTerm.length >= 2 ? customers.filter((customer) =>
      customer.name.toLowerCase().includes(capitalizedTerm.toLowerCase()) ||
      customer.mobile.includes(capitalizedTerm.replace(/\D/g, ''))
    ) : [];
    
    // Show results only if there are matches and term is long enough
    setShowResults(capitalizedTerm.length >= 2 && newFilteredCustomers.length > 0);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(capitalizeWords(customer.name));
    onValueChange(capitalizeWords(customer.name));
    onMobileChange(customer.mobile);
    setShowResults(false);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchTerm("");
    onValueChange("");
    onMobileChange("");
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2 && filteredCustomers.length > 0 && !selectedCustomer) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => setShowResults(false), 150);
  };

  // If a customer is selected, show selected state
  if (selectedCustomer) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <User className="h-4 w-4 text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-blue-800">{selectedCustomer.name}</p>
            <p className="text-sm text-blue-600">{selectedCustomer.mobile}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            className="text-blue-600 border-blue-300 hover:bg-blue-100"
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-10 h-12 border-gray-200"
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="absolute right-2 top-2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results dropdown - only show when there are actual matches */}
      {showResults && filteredCustomers.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">Searching...</div>
          ) : (
            <>
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-800">{customer.name}</p>
                      <p className="text-sm text-gray-600">{customer.mobile}</p>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
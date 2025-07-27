import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Phone } from "lucide-react";
import { useCustomers, Customer } from "@/hooks/useCustomers";

interface ReferenceNameSearchProps {
  value: string;
  onValueChange: (customerName: string) => void;
  onMobileChange: (mobile: string) => void;
  placeholder?: string;
  error?: string;
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
  placeholder = "Enter reference name...",
  error
}: ReferenceNameSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { data: customers = [], isLoading } = useCustomers();

  // Debounced search - only filter after user stops typing for 300ms
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter customers - Use includes for better matching
  const filteredCustomers = customers.filter((customer) => {
    if (debouncedSearchTerm.length < 2) return false;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return customer.name.toLowerCase().includes(searchLower);
  });

  // FIXED: Properly sync with external value
  useEffect(() => {
    if (value && !selectedCustomer) {
      // Check if value matches a customer name
      const matchingCustomer = customers.find(c => c.name.toLowerCase() === value.toLowerCase());
      if (matchingCustomer) {
        setSelectedCustomer(matchingCustomer);
        setSearchTerm("");
        setShowResults(false);
      } else {
        setSearchTerm(value);
      }
    } else if (!value && selectedCustomer) {
      setSelectedCustomer(null);
      setSearchTerm("");
    }
  }, [value, customers, selectedCustomer]);

  // FIXED: Better search change handling
  const handleSearchChange = (newSearchTerm: string) => {
    const capitalizedTerm = capitalizeWords(newSearchTerm);
    setSearchTerm(capitalizedTerm);
    onValueChange(capitalizedTerm);
    
    // Clear selected customer when manually typing
    if (selectedCustomer) {
      setSelectedCustomer(null);
      onMobileChange(""); // Clear mobile when changing selection
    }
    
    // FIXED: Show results only when 2+ characters and reset active index
    setShowResults(capitalizedTerm.length >= 2);
    setActiveIndex(-1);
  };

  // FIXED: Proper customer selection
  const handleSelectCustomer = useCallback((customer: Customer) => {
    const capitalizedName = capitalizeWords(customer.name);
    setSelectedCustomer(customer);
    setSearchTerm("");
    setShowResults(false);
    setActiveIndex(-1);
    onValueChange(capitalizedName);
    onMobileChange(customer.mobile);
  }, [onValueChange, onMobileChange]);

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchTerm("");
    setShowResults(false);
    setActiveIndex(-1);
    onValueChange("");
    onMobileChange("");
  };

  // FIXED: Add keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || filteredCustomers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => 
          prev < filteredCustomers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => 
          prev > 0 ? prev - 1 : filteredCustomers.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && filteredCustomers[activeIndex]) {
          handleSelectCustomer(filteredCustomers[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Show results only when there are actual customer matches
  const shouldShowResults = showResults && debouncedSearchTerm.length >= 2 && (isLoading || filteredCustomers.length > 0);

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
              onKeyDown={handleKeyDown}
              className={`pl-10 h-12 ${error ? "border-red-500" : ""}`}
            />
          </div>

          {/* Dropdown with better z-index and background */}
          {shouldShowResults && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-auto bg-white border border-gray-300 rounded-lg shadow-xl">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <div className="mt-2">Loading customers...</div>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No customers found matching "{debouncedSearchTerm}"
                  <div className="text-xs mt-1 text-gray-400">You can still type the name manually</div>
                </div>
              ) : (
                <div className="py-2">
                  {filteredCustomers.map((customer, index) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
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
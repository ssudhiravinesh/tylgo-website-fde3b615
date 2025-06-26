import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Phone, User } from "lucide-react";
import { useCustomers, Customer } from "@/hooks/useCustomers";

interface MobileNumberSearchProps {
  value: string;
  onChange: (value: string) => void;
  onCustomerFound: (customer: Customer | null) => void;
  placeholder?: string;
  className?: string;
}

export const MobileNumberSearch = ({ 
  value, 
  onChange, 
  onCustomerFound, 
  placeholder = "+91 98765 43210",
  className = ""
}: MobileNumberSearchProps) => {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const { data: customers = [] } = useCustomers();
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);

  const handleInputChange = (inputValue: string) => {
    // Handle mobile number formatting
    let cleanValue = inputValue.replace(/[^\d+]/g, '');
    
    // If it starts with +91, keep it as is
    if (cleanValue.startsWith('+91')) {
      // Limit to +91 + 10 digits
      if (cleanValue.length > 13) {
        cleanValue = cleanValue.substring(0, 13);
      }
    } else {
      // If it doesn't start with +91, add it and limit to 10 digits after
      if (cleanValue.startsWith('91') && cleanValue.length > 2) {
        cleanValue = '+' + cleanValue.substring(0, 12);
      } else if (cleanValue.length > 0 && !cleanValue.startsWith('+91')) {
        cleanValue = '+91' + cleanValue.substring(0, 10);
      } else if (cleanValue.length === 0) {
        cleanValue = '+91';
      }
    }
    
    onChange(cleanValue);

    // Search for customer with this mobile number
    if (cleanValue.length >= 13) { // +91 + 10 digits
      const customer = customers.find(c => c.mobile === cleanValue);
      if (customer) {
        setFoundCustomer(customer);
        setShowSuggestion(true);
        onCustomerFound(customer);
      } else {
        setFoundCustomer(null);
        setShowSuggestion(false);
        onCustomerFound(null);
      }
    } else {
      setFoundCustomer(null);
      setShowSuggestion(false);
      onCustomerFound(null);
    }
  };

  const handleSelectCustomer = () => {
    if (foundCustomer) {
      setShowSuggestion(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="tel"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          className={`pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${className}`}
        />
      </div>

      {/* Customer suggestion */}
      {showSuggestion && foundCustomer && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-green-300 rounded-lg shadow-lg">
          <div 
            className="p-3 hover:bg-green-50 cursor-pointer border-l-4 border-green-500"
            onClick={handleSelectCustomer}
          >
            <div className="flex items-center gap-2 text-green-700">
              <User className="h-4 w-4" />
              <span className="font-medium">Customer Found!</span>
            </div>
            <div className="text-sm text-green-600 mt-1">
              <div className="font-medium">{foundCustomer.name}</div>
              <div>{foundCustomer.mobile}</div>
              {foundCustomer.address && (
                <div className="text-xs text-gray-600 mt-1">{foundCustomer.address}</div>
              )}
            </div>
            <div className="text-xs text-green-600 mt-2">
              Click to use this customer's details
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { User, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { toast } from "sonner";

interface MobileNumberSearchProps {
  value: string;
  onChange: (value: string) => void;
  onCustomerFound?: (customer: Customer | null) => void;
  className?: string;
  placeholder?: string;
  searchType?: 'customer' | 'reference';
  label?: string;
  error?: string;
}

export const MobileNumberSearch = ({ 
  value, 
  onChange, 
  onCustomerFound, 
  className = "",
  placeholder = "9876543210",
  searchType = 'customer',
  label = 'customers',
  error
}: MobileNumberSearchProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const { data: customers = [], isLoading } = useCustomers();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter customers based on mobile number input
  const filteredCustomers = customers.filter(customer => {
    if (!value.trim()) return false;
    
    // Clean both search value and customer mobile for comparison
    const searchValue = value.replace(/\D/g, ''); // Remove all non-digits
    const customerMobile = customer.mobile.replace(/\D/g, ''); // Remove all non-digits
    
    // Search starts immediately when user types any digit
    if (searchValue.length === 0) return false;
    
    // Check if customer mobile starts with or contains the search value
    return customerMobile.includes(searchValue);
  });

  // Show dropdown when there are filtered results and input is focused
  useEffect(() => {
    if (inputFocused && filteredCustomers.length > 0 && value.trim()) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [filteredCustomers.length, inputFocused, value]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setInputFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (inputValue: string) => {
    // Remove all non-digit characters
    const digitsOnly = inputValue.replace(/\D/g, '');
    
    // Limit to 10 digits maximum
    const limitedDigits = digitsOnly.slice(0, 10);
    
    onChange(limitedDigits);
  };

  const handleCustomerSelect = (customer: Customer) => {
    // Extract only digits from customer mobile and limit to 10 digits
    const cleanMobile = customer.mobile.replace(/\D/g, '').slice(-10);
    onChange(cleanMobile);
    setShowDropdown(false);
    setInputFocused(false);
    
    if (onCustomerFound) {
      onCustomerFound(customer);
    }

    // Show success message
    const customerType = searchType === 'reference' ? 'Reference' : 'Customer';
    toast.success(`${customerType} "${customer.name}" details loaded!`);
  };

  const handleInputFocus = () => {
    setInputFocused(true);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Don't hide dropdown if clicking on dropdown item
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    // Delay hiding to allow for customer selection
    setTimeout(() => {
      setInputFocused(false);
      setShowDropdown(false);
    }, 150);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={cn(
            "pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500",
            error ? "border-red-500" : "",
            className
          )}
        />
      </div>
      
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Loading {label}...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No {label} found with this mobile number.
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                {searchType === 'reference' ? 'Select existing customer as reference:' : 'Existing customers found:'}
              </div>
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{customer.name}</span>
                      {searchType === 'reference' && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          Use as Reference
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3 text-green-600" />
                      <span className="font-mono">{customer.mobile.replace(/\D/g, '').slice(-10)}</span>
                    </div>
                    {customer.address && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

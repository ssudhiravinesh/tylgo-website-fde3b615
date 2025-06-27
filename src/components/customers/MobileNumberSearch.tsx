import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { User, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers, Customer } from "@/hooks/useCustomers";

interface MobileNumberSearchProps {
  value: string;
  onChange: (value: string) => void;
  onCustomerFound?: (customer: Customer | null) => void;
  className?: string;
  placeholder?: string;
  searchType?: 'customer' | 'reference'; // New prop to distinguish search context
  label?: string; // For better UX messaging
}

export const MobileNumberSearch = ({ 
  value, 
  onChange, 
  onCustomerFound, 
  className = "",
  placeholder = "+91 98765 43210",
  searchType = 'customer',
  label = 'customers'
}: MobileNumberSearchProps) => {
  const [open, setOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const { data: customers = [], isLoading } = useCustomers();

  // Filter customers based on mobile number input
  const filteredCustomers = customers.filter(customer => {
    if (!value.trim()) return false;
    
    // Remove +91 prefix for comparison
    const searchValue = value.replace('+91', '').trim();
    const customerMobile = customer.mobile.replace('+91', '').trim();
    
    // Show results when we have at least 3 digits
    if (searchValue.length < 3) return false;
    
    return customerMobile.includes(searchValue);
  });

  // Additional filtering for reference search - includes customers who could be references
  const searchResults = searchType === 'reference' 
    ? filteredCustomers // For references, show all matching customers
    : filteredCustomers; // For customer search, also show all (they might be existing customers)

  // Auto-open dropdown when there are filtered results and input is focused
  useEffect(() => {
    if (inputFocused && searchResults.length > 0 && value.trim()) {
      setOpen(true);
    } else if (!inputFocused || searchResults.length === 0) {
      setOpen(false);
    }
  }, [searchResults.length, inputFocused, value]);

  const handleInputChange = (inputValue: string) => {
    // Format the input to include +91 prefix
    let formattedValue = inputValue;
    
    // Remove any non-digit characters except +
    const digitsOnly = inputValue.replace(/[^\d+]/g, '');
    
    // If user starts typing digits, auto-add +91
    if (digitsOnly && !digitsOnly.startsWith('+91')) {
      if (digitsOnly.startsWith('91')) {
        formattedValue = '+' + digitsOnly;
      } else {
        formattedValue = '+91' + digitsOnly;
      }
    } else {
      formattedValue = digitsOnly;
    }
    
    onChange(formattedValue);
  };

  const handleCustomerSelect = (customer: Customer) => {
    onChange(customer.mobile);
    setOpen(false);
    setInputFocused(false);
    
    if (onCustomerFound) {
      onCustomerFound(customer);
    }
  };

  // Get appropriate messaging based on search type
  const getEmptyMessage = () => {
    if (isLoading) return `Loading ${label}...`;
    if (value.trim().length < 3) return "Type at least 3 digits to search...";
    return `No ${label} found with this mobile number.`;
  };

  const getDropdownHeader = () => {
    if (searchType === 'reference') {
      return `Select existing customer as reference:`;
    }
    return `Existing customers found:`;
  };

  const handleInputFocus = () => {
    setInputFocused(true);
  };

  const handleInputBlur = () => {
    // Delay hiding to allow for customer selection
    setTimeout(() => {
      setInputFocused(false);
    }, 200);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={placeholder}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className={cn(
                "pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500",
                className
              )}
            />
          </div>
        </PopoverTrigger>
        
        {open && (
          <PopoverContent 
            className="w-full min-w-[400px] p-0" 
            align="start"
            side="bottom"
          >
            <Command>
              <CommandList>
                <CommandEmpty>
                  {getEmptyMessage()}
                </CommandEmpty>
                {searchResults.length > 0 && (
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    {getDropdownHeader()}
                  </div>
                )}
                <CommandGroup>
                  {searchResults.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleCustomerSelect(customer)}
                      className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50"
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
                          <span className="font-mono">{customer.mobile}</span>
                        </div>
                        {customer.address && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};
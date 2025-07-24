import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useCustomers } from "@/hooks/useCustomers";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
}

interface MobileNumberSearchProps {
  value: string;
  onChange: (value: string) => void;
  onCustomerSelect?: (customer: Customer) => void;
  onCustomerFound?: (customer: Customer | null) => void;
  placeholder?: string;
  className?: string;
  searchType?: string;
  label?: string;
  error?: string;
}

export const MobileNumberSearch = ({
  value,
  onChange,
  onCustomerSelect,
  onCustomerFound,
  placeholder = "Enter mobile number",
  className = "",
  searchType = "customer",
  label,
  error
}: MobileNumberSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { data: customers = [] } = useCustomers();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter customers based on mobile number input
  const filteredCustomers = customers.filter(customer =>
    customer.mobile.includes(value) && value.length > 0
  );

  // Show dropdown when there are matches and input is focused
  useEffect(() => {
    setIsOpen(filteredCustomers.length > 0 && value.length > 0);
    setSelectedIndex(-1);
  }, [filteredCustomers.length, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Limit input to 10 digits for mobile numbers
    const inputValue = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(inputValue);
    
    // Call onCustomerFound with null when input changes and no exact match
    if (onCustomerFound) {
      const exactMatch = customers.find(customer => customer.mobile === inputValue);
      onCustomerFound(exactMatch || null);
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    
    onChange(customer.mobile);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    }
    
    if (onCustomerFound) {
      onCustomerFound(customer);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCustomers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredCustomers.length) {
          const selectedCustomer = filteredCustomers[selectedIndex];
          handleCustomerClick(selectedCustomer);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputFocus = () => {
    if (filteredCustomers.length > 0 && value.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Increased timeout to allow for click events on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }, 300); // Increased from 150ms to 300ms
  };

  // Add mousedown handler to prevent blur when clicking on dropdown
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the input from losing focus
  };

  return (
    <div className={`relative ${className}`}>
      <Input
        ref={inputRef}
        type="tel"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={`w-full ${error ? "border-red-500" : ""}`}
      />
      
      {isOpen && filteredCustomers.length > 0 && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto shadow-lg bg-white"
          onMouseDown={handleMouseDown} // Add this to prevent blur
        >
          <div className="py-1">
            {filteredCustomers.map((customer, index) => (
              <div
                key={customer.id}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  index === selectedIndex 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleCustomerClick(customer)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="font-medium text-sm">{customer.name}</div>
                <div className="text-xs text-gray-600">{customer.mobile}</div>
                {customer.address && (
                  <div className="text-xs text-gray-500 truncate">{customer.address}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
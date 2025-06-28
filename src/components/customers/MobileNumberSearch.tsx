
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
  placeholder?: string;
  className?: string;
}

export const MobileNumberSearch = ({
  value,
  onChange,
  onCustomerSelect,
  placeholder = "Enter mobile number",
  className = ""
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
    onChange(e.target.value);
  };

  const handleCustomerClick = (customer: Customer) => {
    console.log('Customer clicked:', customer);
    onChange(customer.mobile);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onCustomerSelect) {
      onCustomerSelect(customer);
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
    // Delay closing to allow for click events on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }, 150);
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
        className="w-full"
      />
      
      {isOpen && filteredCustomers.length > 0 && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto shadow-lg"
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
                onMouseDown={(e) => {
                  // Prevent input blur when clicking on dropdown item
                  e.preventDefault();
                }}
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

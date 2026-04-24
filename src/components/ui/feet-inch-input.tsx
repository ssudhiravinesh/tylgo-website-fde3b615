
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface FeetInchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const FeetInchInput: React.FC<FeetInchInputProps> = ({
  value,
  onChange,
  placeholder = "21 10",
  disabled = false
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  // Convert decimal feet to "feet inches" format for display
  const decimalFeetToDisplay = (decimalFeet: number): string => {
    const feet = Math.floor(decimalFeet);
    const inches = Math.round((decimalFeet - feet) * 12);
    
    if (inches === 0) {
      return feet.toString();
    }
    return `${feet} ${inches}`;
  };

  // Convert "feet inches" to decimal feet for backend
  const displayToDecimalFeet = (input: string): number => {
    // Remove quotes and extra spaces
    const cleaned = input.replace(/['"]/g, '').trim();
    const parts = cleaned.split(/\s+/).filter(part => part !== '');
    
    if (parts.length === 0) return 0;
    
    const feet = parseInt(parts[0]) || 0;
    let inches = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
    
    // Limit inches to maximum 11
    if (inches > 11) {
      inches = 11;
    }
    
    return feet + (inches / 12);
  };

  // Format display value with quotes
  const formatDisplayValue = (input: string): string => {
    // Remove any existing quotes first
    const cleaned = input.replace(/['"]/g, '').trim();
    const parts = cleaned.split(/\s+/).filter(part => part !== '');
    
    if (parts.length === 0) return '';
    if (parts.length === 1) return `${parts[0]}'`;
    
    // Only take first two numbers and limit inches to 11
    const feet = parts[0];
    let inches = parseInt(parts[1]) || 0;
    if (inches > 11) inches = 11;
    
    return `${feet}' ${inches}"`;
  };

  // Initialize display value from decimal feet
  useEffect(() => {
    if (value && !isNaN(parseFloat(value))) {
      const decimalFeet = parseFloat(value);
      if (decimalFeet > 0) {
        const displayFormat = decimalFeetToDisplay(decimalFeet);
        setDisplayValue(formatDisplayValue(displayFormat));
      } else {
        setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Allow only numbers, spaces, and quotes (quotes will be auto-added)
    inputValue = inputValue.replace(/[^0-9\s'"]/g, '');
    
    // Remove any manually typed quotes to prevent duplication
    const cleanValue = inputValue.replace(/['"]/g, '');
    
    // Split by spaces and limit to 2 numbers
    const parts = cleanValue.split(/\s+/).filter(part => part !== '');
    const limitedParts = parts.slice(0, 2);
    
    // Limit inches to 11 if present
    if (limitedParts.length > 1) {
      const inches = parseInt(limitedParts[1]) || 0;
      if (inches > 11) {
        limitedParts[1] = '11';
      }
    }
    
    // Reconstruct the clean input
    const cleanInput = limitedParts.join(' ');
    
    // Format with quotes
    const formattedValue = formatDisplayValue(cleanInput);
    setDisplayValue(formattedValue);
    
    // Convert to decimal feet and update parent
    if (cleanInput.trim()) {
      const decimalFeet = displayToDecimalFeet(cleanInput);
      if (decimalFeet > 0) {
        onChange(decimalFeet.toFixed(4));
      } else {
        onChange('');
      }
    } else {
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle spacebar for auto-formatting
    if (e.key === ' ') {
      const currentValue = displayValue.replace(/['"]/g, '');
      const parts = currentValue.split(' ').filter(part => part !== '');
      
      // If we have one number, add apostrophe for feet
      if (parts.length === 1 && parts[0]) {
        const newValue = `${parts[0]}' `;
        setDisplayValue(newValue);
        e.preventDefault();
        return;
      }
      
      // If we have two numbers, add double quote for inches
      if (parts.length === 2 && parts[1]) {
        let inches = parseInt(parts[1]) || 0;
        if (inches > 11) inches = 11;
        const newValue = `${parts[0]}' ${inches}"`;
        setDisplayValue(newValue);
        
        // Update the backend value
        const decimalFeet = parseInt(parts[0]) + (inches / 12);
        onChange(decimalFeet.toFixed(4));
        e.preventDefault();
        return;
      }
    }
    
    // Allow: backspace, delete, tab, escape, enter, arrows, home, end
    if (
      // Control keys
      [8, 9, 27, 13, 46, 37, 38, 39, 40, 35, 36].includes(e.keyCode) ||
      // Ctrl combinations
      (e.ctrlKey && [65, 67, 86, 88, 90].includes(e.keyCode)) ||
      // Numbers (0-9) on main keyboard
      (e.keyCode >= 48 && e.keyCode <= 57 && !e.shiftKey) ||
      // Numbers (0-9) on numpad
      (e.keyCode >= 96 && e.keyCode <= 105) ||
      // Space bar
      e.keyCode === 32
    ) {
      // Allow these keys
      return;
    }
    
    // Prevent all other keys
    e.preventDefault();
  };

  return (
    <div className="space-y-1">
      <Input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="font-mono"
      />
      <div className="text-xs text-muted-foreground">
        Enter feet and inches (e.g., "21 10" for 21 feet 10 inches). Press space after each number for auto-formatting.
      </div>
    </div>
  );
};

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
  placeholder = "20 5",
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
    
    // Convert inches >= 12 to additional feet
    const additionalFeet = Math.floor(inches / 12);
    inches = inches % 12;
    
    return feet + additionalFeet + (inches / 12);
  };

  // Format display value with quotes
  const formatDisplayValue = (input: string): string => {
    // Remove any existing quotes first
    const cleaned = input.replace(/['"]/g, '').trim();
    const parts = cleaned.split(/\s+/).filter(part => part !== '');
    
    if (parts.length === 0) return '';
    if (parts.length === 1) return `${parts[0]}'`;
    
    // Only take first two numbers
    const feet = parts[0];
    const inches = parts[1];
    
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
    
    // Validate and limit inches to 0-11
    if (limitedParts.length === 2) {
      const inches = parseInt(limitedParts[1]) || 0;
      if (inches > 11) {
        // Auto-convert excess inches to feet
        const additionalFeet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        const totalFeet = (parseInt(limitedParts[0]) || 0) + additionalFeet;
        
        limitedParts[0] = totalFeet.toString();
        limitedParts[1] = remainingInches === 0 ? '' : remainingInches.toString();
        
        // Remove empty inches part
        if (limitedParts[1] === '') {
          limitedParts.splice(1, 1);
        }
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
    // Allow: backspace, delete, tab, escape, enter, space
    if ([8, 9, 27, 13, 32, 46].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
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
      <div className="text-xs text-gray-500">
        Enter feet and inches separated by space (e.g., "20 5" for 20 feet 5 inches)
      </div>
    </div>
  );
};

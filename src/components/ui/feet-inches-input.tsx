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
  const [inputValue, setInputValue] = useState<string>('');

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
    const cleaned = input.trim();
    const parts = cleaned.split(/\s+/).filter(part => part !== '');
    
    if (parts.length === 0) return 0;
    
    const feet = parseInt(parts[0]) || 0;
    let inches = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
    
    // Auto-correct inches >= 12
    const additionalFeet = Math.floor(inches / 12);
    inches = inches % 12;
    
    return feet + additionalFeet + (inches / 12);
  };

  // Format display value with quotes for visual feedback
  const getDisplayValue = (input: string): string => {
    const parts = input.trim().split(/\s+/).filter(part => part !== '');
    
    if (parts.length === 0) return '';
    if (parts.length === 1) return `${parts[0]}'`;
    
    return `${parts[0]}' ${parts[1]}"`;
  };

  // Initialize input value from decimal feet
  useEffect(() => {
    if (value && !isNaN(parseFloat(value))) {
      const decimalFeet = parseFloat(value);
      if (decimalFeet > 0) {
        const displayFormat = decimalFeetToDisplay(decimalFeet);
        setInputValue(displayFormat);
      } else {
        setInputValue('');
      }
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Allow only numbers and spaces
    newValue = newValue.replace(/[^0-9\s]/g, '');
    
    // Split by spaces and limit to 2 numbers
    const parts = newValue.split(/\s+/).filter(part => part !== '');
    if (parts.length > 2) {
      parts.splice(2);
      newValue = parts.join(' ');
    }
    
    // Auto-correct inches if > 11
    if (parts.length === 2) {
      const inches = parseInt(parts[1]) || 0;
      if (inches > 11) {
        const additionalFeet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        const totalFeet = (parseInt(parts[0]) || 0) + additionalFeet;
        
        if (remainingInches === 0) {
          newValue = totalFeet.toString();
        } else {
          newValue = `${totalFeet} ${remainingInches}`;
        }
      }
    }
    
    setInputValue(newValue);
    
    // Convert to decimal feet and update parent
    if (newValue.trim()) {
      const decimalFeet = displayToDecimalFeet(newValue);
      if (decimalFeet > 0) {
        onChange(decimalFeet.toFixed(4));
      } else {
        onChange('');
      }
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="font-mono"
        />
        {inputValue && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-muted-foreground">
            {getDisplayValue(inputValue)}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Enter feet and inches separated by space (e.g., "20 5" for 20 feet 5 inches)
      </div>
    </div>
  );
};

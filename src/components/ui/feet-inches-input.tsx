import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface FeetInchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const FeetInchInput: React.FC<FeetInchInputProps> = ({
  value,
  onChange,
  placeholder = "20 5",
  disabled = false,
  ...props
}) => {
  const [inputValue, setInputValue] = useState<string>('');

  // Convert decimal feet to "feet inches" format for display
  const decimalFeetToDisplay = (decimalFeet: number): string => {
    // If it's a clean decimal (e.g., entered by user), keep it as decimal
    // We check if it has exact precision or if it's repeating
    const isCleanDecimal = Math.abs(decimalFeet * 100 - Math.round(decimalFeet * 100)) < 0.0001;
    
    const feet = Math.floor(decimalFeet);
    const inches = Math.round((decimalFeet - feet) * 12);
    
    // If the input perfectly matches a decimal, or if inches == 0, we could show decimal
    // But for legacy compatibility, if it perfectly converts to inches, we show inches
    // Unless it was entered as a decimal. But here we don't know how it was entered.
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
    
    // Check if it's already a decimal format (single number, optionally with dot)
    if (parts.length === 1) {
      return parseFloat(parts[0]) || 0;
    }
    
    const feet = parseFloat(parts[0]) || 0;
    let inches = parts.length > 1 ? parseFloat(parts[1]) || 0 : 0;
    
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
        // Prevent overwriting user's active input if it evaluates to the same decimal value
        const currentDecimal = displayToDecimalFeet(inputValue);
        if (Math.abs(currentDecimal - decimalFeet) > 0.0001) {
          // If the parent provided a value that looks like a direct decimal string (e.g. "10.5" instead of a calculated fraction like "10.4167")
          // and the user didn't enter it, we can format it.
          // To be safe and support decimal feet explicitly, if the value contains a decimal point and is relatively clean, 
          // we can just show it as is, or use decimalFeetToDisplay.
          // Let's use decimalFeetToDisplay for calculated values, but if it has a decimal point and no spaces, let's just use the value.
          if (value.includes('.') && value.split('.')[1].length <= 2) {
             setInputValue(value);
          } else {
             const displayFormat = decimalFeetToDisplay(decimalFeet);
             setInputValue(displayFormat);
          }
        }
      } else {
        setInputValue('');
      }
    } else {
      setInputValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Allow only numbers, spaces, and decimals
    newValue = newValue.replace(/[^0-9\s.]/g, '');
    
    // Handle multiple decimal points in a single part by keeping only the first
    const partsBySpace = newValue.split(/\s+/);
    newValue = partsBySpace.map(part => {
      const firstDecimal = part.indexOf('.');
      if (firstDecimal !== -1) {
        return part.slice(0, firstDecimal + 1) + part.slice(firstDecimal + 1).replace(/\./g, '');
      }
      return part;
    }).join(' ');

    // Split by spaces and limit to 2 numbers
    const parts = newValue.split(/\s+/).filter(part => part !== '');
    if (parts.length > 2) {
      parts.splice(2);
      newValue = parts.join(' ');
    }
    
    // Auto-correct inches if > 11 and no decimals in the inches part
    if (parts.length === 2 && !parts[1].includes('.')) {
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
      // Don't update parent if trailing decimal point
      if (newValue.endsWith('.')) {
         return; 
      }
      const decimalFeet = displayToDecimalFeet(newValue);
      if (decimalFeet > 0) {
        // Output with precision based on input mode.
        // If it's a direct decimal with 2 digits, keep it to 2 digits.
        // Otherwise, 4 digits precision for inches accuracy.
        if (parts.length === 1 && newValue.includes('.')) {
            // Keep the exact precision the user entered or 2 digits
            const decimalPlaces = newValue.split('.')[1]?.length || 0;
            const precision = Math.max(2, Math.min(4, decimalPlaces));
            onChange(decimalFeet.toFixed(precision));
        } else {
            onChange(decimalFeet.toFixed(4));
        }
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
          {...props}
        />
        {inputValue && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-muted-foreground">
            {getDisplayValue(inputValue)}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Enter feet and inches separated by space (e.g., "20 5" or "20.5")
      </div>
    </div>
  );
};


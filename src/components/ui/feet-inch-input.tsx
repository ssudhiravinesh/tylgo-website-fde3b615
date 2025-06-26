import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface FeetInchesInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const FeetInchesInput: React.FC<FeetInchesInputProps> = ({
  value,
  onChange,
  placeholder = "0' 0\"",
  disabled = false
}) => {
  const [feet, setFeet] = useState<string>('');
  const [inches, setInches] = useState<string>('');

  // Parse the decimal value into feet and inches
  useEffect(() => {
    if (value && !isNaN(parseFloat(value))) {
      const totalFeet = parseFloat(value);
      const feetPart = Math.floor(totalFeet);
      const inchesPart = Math.round((totalFeet - feetPart) * 12 * 100) / 100;
      
      setFeet(feetPart.toString());
      setInches(inchesPart.toString());
    } else if (!value) {
      setFeet('');
      setInches('');
    }
  }, [value]);

  // Convert feet and inches back to decimal feet
  const updateValue = (newFeet: string, newInches: string) => {
    const feetNum = parseFloat(newFeet) || 0;
    const inchesNum = parseFloat(newInches) || 0;
    const totalFeet = feetNum + (inchesNum / 12);
    
    if (totalFeet > 0) {
      onChange(totalFeet.toFixed(4));
    } else {
      onChange('');
    }
  };

  const handleFeetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFeet = e.target.value;
    setFeet(newFeet);
    updateValue(newFeet, inches);
  };

  const handleInchesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInches = e.target.value;
    setInches(newInches);
    updateValue(feet, newInches);
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1">
        <Input
          type="number"
          min="0"
          step="1"
          value={feet}
          onChange={handleFeetChange}
          placeholder="0"
          disabled={disabled}
          className="text-center"
        />
        <div className="text-xs text-center text-gray-500 mt-1">feet</div>
      </div>
      <span className="text-gray-400">′</span>
      <div className="flex-1">
        <Input
          type="number"
          min="0"
          max="11.99"
          step="0.01"
          value={inches}
          onChange={handleInchesChange}
          placeholder="0"
          disabled={disabled}
          className="text-center"
        />
        <div className="text-xs text-center text-gray-500 mt-1">inches</div>
      </div>
      <span className="text-gray-400">″</span>
    </div>
  );
};

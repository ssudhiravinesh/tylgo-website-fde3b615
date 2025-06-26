
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface FeetInchesInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const FeetInchesInput = ({ 
  value, 
  onChange, 
  placeholder = "0.00", 
  disabled = false,
  className = ""
}: FeetInchesInputProps) => {
  const [displayValue, setDisplayValue] = useState("");

  // Convert decimal feet to feet and inches display
  const convertDecimalToFeetInches = (decimal: string) => {
    if (!decimal || decimal === "0" || decimal === "") return "";
    
    const totalFeet = parseFloat(decimal);
    if (isNaN(totalFeet)) return "";
    
    const feet = Math.floor(totalFeet);
    const inches = Math.round((totalFeet - feet) * 12);
    
    if (inches === 0) {
      return feet > 0 ? `${feet}'` : "";
    } else if (inches === 12) {
      return `${feet + 1}'`;
    } else {
      return `${feet}' ${inches}"`;
    }
  };

  // Convert feet and inches display to decimal feet
  const convertFeetInchesToDecimal = (input: string) => {
    if (!input.trim()) return "0";
    
    // Remove extra spaces and normalize
    const cleaned = input.trim().replace(/\s+/g, ' ');
    
    // Pattern to match: "5' 6"" or "5'" or "6""
    const feetInchesPattern = /^(\d+(?:\.\d+)?)'?\s*(\d+(?:\.\d+)?)?"?$/;
    const feetOnlyPattern = /^(\d+(?:\.\d+)?)'?$/;
    const inchesOnlyPattern = /^(\d+(?:\.\d+)?)\"?$/;
    
    let totalFeet = 0;
    
    if (feetInchesPattern.test(cleaned)) {
      const matches = cleaned.match(feetInchesPattern);
      if (matches) {
        const feet = parseFloat(matches[1] || "0");
        const inches = parseFloat(matches[2] || "0");
        totalFeet = feet + (inches / 12);
      }
    } else if (feetOnlyPattern.test(cleaned)) {
      const matches = cleaned.match(feetOnlyPattern);
      if (matches) {
        totalFeet = parseFloat(matches[1]);
      }
    } else if (inchesOnlyPattern.test(cleaned)) {
      const matches = cleaned.match(inchesOnlyPattern);
      if (matches) {
        totalFeet = parseFloat(matches[1]) / 12;
      }
    } else {
      // Try to parse as decimal
      const decimal = parseFloat(cleaned);
      if (!isNaN(decimal)) {
        totalFeet = decimal;
      }
    }
    
    return totalFeet.toFixed(2);
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(convertDecimalToFeetInches(value));
  }, [value]);

  const handleInputChange = (inputValue: string) => {
    setDisplayValue(inputValue);
    
    // Convert to decimal and update parent
    const decimalValue = convertFeetInchesToDecimal(inputValue);
    onChange(decimalValue);
  };

  const handleBlur = () => {
    // Reformat the display value on blur
    const decimal = convertFeetInchesToDecimal(displayValue);
    const formatted = convertDecimalToFeetInches(decimal);
    setDisplayValue(formatted);
  };

  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={displayValue}
      onChange={(e) => handleInputChange(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className={className}
    />
  );
};

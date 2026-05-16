
// Conversion factors to feet
const CONVERSION_TO_FEET = {
  metre: 3.28084,
  inches: 1 / 12,
  mm: 0.00328084,
  feet: 1
} as const;

export type Unit = 'metre' | 'inches' | 'mm' | 'feet';
export type ProductUnit = 'mm' | 'cm' | 'in' | 'ft' | 'm';

// Conversion factors to mm (base unit for products)
const PRODUCT_CONVERSION_TO_MM = {
  mm: 1,
  cm: 10,
  in: 25.4,
  ft: 304.8,
  m: 1000
} as const;

export const convertProductDimension = (value: number, fromUnit: ProductUnit, toUnit: ProductUnit = 'mm'): number => {
  const valueInMm = value * PRODUCT_CONVERSION_TO_MM[fromUnit];
  return valueInMm / PRODUCT_CONVERSION_TO_MM[toUnit];
};

export const formatProductDimension = (value: number, unit: ProductUnit): string => {
  return `${value} ${unit}`;
};

export const convertToFeet = (value: number, fromUnit: Unit): number => {
  return value * CONVERSION_TO_FEET[fromUnit];
};

export const calculateAreaInSquareFeet = (length: number, width: number, unit: Unit): number => {
  const lengthInFeet = convertToFeet(length, unit);
  const widthInFeet = convertToFeet(width, unit);
  return lengthInFeet * widthInFeet;
};

export const formatDimensions = (length: number, width: number, unit: Unit): string => {
  const fmt = (n: number) => parseFloat(n.toFixed(4));
  return `${fmt(length)} × ${fmt(width)} ${unit}`;
};

export const formatArea = (area: number): string => {
  return `${area.toFixed(2)} sq ft`;
};

// Convert decimal feet back to feet-inches display format
export const decimalFeetToFeetInches = (decimalFeet: number): string => {
  const feet = Math.floor(decimalFeet);
  const inches = Math.round((decimalFeet - feet) * 12);

  if (inches === 0) {
    return `${feet}'`;
  }
  return `${feet}' ${inches}"`;
};

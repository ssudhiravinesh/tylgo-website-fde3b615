
// Conversion factors to feet
const CONVERSION_TO_FEET = {
  metre: 3.28084,
  inches: 1/12,
  mm: 0.00328084,
  feet: 1
} as const;

export type Unit = 'metre' | 'inches' | 'mm' | 'feet';

export const convertToFeet = (value: number, fromUnit: Unit): number => {
  return value * CONVERSION_TO_FEET[fromUnit];
};

export const calculateAreaInSquareFeet = (length: number, width: number, unit: Unit): number => {
  const lengthInFeet = convertToFeet(length, unit);
  const widthInFeet = convertToFeet(width, unit);
  return lengthInFeet * widthInFeet;
};

export const formatDimensions = (length: number, width: number, unit: Unit): string => {
  return `${length} × ${width} ${unit}`;
};

export const formatArea = (area: number): string => {
  return `${area.toFixed(2)} sq ft`;
};

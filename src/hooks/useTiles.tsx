
import { useState } from 'react';

export interface Tile {
  id: string;
  code: string;
  name: string;
  size_length: number;
  size_breadth: number;
  price_per_sqm: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

// Mock data for demonstration
const mockTiles: Tile[] = [
  {
    id: '1',
    code: 'TH001',
    name: 'Marble Classic White',
    size_length: 600,
    size_breadth: 600,
    price_per_sqm: 450,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    code: 'TH002',
    name: 'Wooden Oak Brown',
    size_length: 800,
    size_breadth: 200,
    price_per_sqm: 580,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    code: 'TH003',
    name: 'Stone Grey Textured',
    size_length: 300,
    size_breadth: 300,
    price_per_sqm: 320,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    code: 'TH004',
    name: 'Ceramic Blue Ocean',
    size_length: 400,
    size_breadth: 400,
    price_per_sqm: 275,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    code: 'TH005',
    name: 'Granite Black Pearl',
    size_length: 600,
    size_breadth: 300,
    price_per_sqm: 680,
    created_at: new Date().toISOString()
  },
  {
    id: '6',
    code: 'TH006',
    name: 'Mosaic Multi Color',
    size_length: 250,
    size_breadth: 250,
    price_per_sqm: 420,
    created_at: new Date().toISOString()
  }
];

export const useTiles = () => {
  const [tiles] = useState<Tile[]>(mockTiles);
  const [isLoading] = useState(false);

  return {
    data: tiles,
    isLoading
  };
};

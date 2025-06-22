
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Grid3X3, QrCode, Ruler, IndianRupee } from "lucide-react";

// Mock tile data
const mockTiles = [
  {
    id: "1",
    code: "TH001",
    name: "Marble Classic White",
    sizeLength: 600,
    sizeBreadth: 600,
    pricePerSqm: 450,
    imageUrl: "/placeholder.svg"
  },
  {
    id: "2", 
    code: "TH002",
    name: "Wooden Oak Brown",
    sizeLength: 800,
    sizeBreadth: 200,
    pricePerSqm: 580,
    imageUrl: "/placeholder.svg"
  },
  {
    id: "3",
    code: "TH003",
    name: "Stone Grey Textured",
    sizeLength: 300,
    sizeBreadth: 300,
    pricePerSqm: 320,
    imageUrl: "/placeholder.svg"
  },
  {
    id: "4",
    code: "TH004",
    name: "Ceramic Blue Ocean",
    sizeLength: 400,
    sizeBreadth: 400,
    pricePerSqm: 275,
    imageUrl: "/placeholder.svg"
  },
  {
    id: "5",
    code: "TH005",
    name: "Granite Black Pearl",
    sizeLength: 600,
    sizeBreadth: 300,
    pricePerSqm: 680,
    imageUrl: "/placeholder.svg"
  },
  {
    id: "6",
    code: "TH006",
    name: "Mosaic Multi Color",
    sizeLength: 250,
    sizeBreadth: 250,
    pricePerSqm: 420,
    imageUrl: "/placeholder.svg"
  }
];

export const TileCatalog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  const filteredTiles = mockTiles.filter(tile =>
    tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tile Catalog</h1>
          <p className="text-gray-600">Browse and search through our tile collection</p>
        </div>
        
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" />
          Scan QR Code
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by tile name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTiles.map((tile) => (
          <Card 
            key={tile.id} 
            className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200 ${
              selectedTile === tile.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
            }`}
            onClick={() => setSelectedTile(selectedTile === tile.id ? null : tile.id)}
          >
            <CardContent className="p-4">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <Grid3X3 className="h-12 w-12 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {tile.code}
                  </Badge>
                  {selectedTile === tile.id && (
                    <Badge className="bg-blue-600 text-white text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-gray-800 text-sm line-clamp-2">
                  {tile.name}
                </h3>
                
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Ruler className="h-3 w-3" />
                  {tile.sizeLength} × {tile.sizeBreadth} mm
                </div>
                
                <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                  <IndianRupee className="h-4 w-4" />
                  {tile.pricePerSqm}/m²
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle add to quotation
                    console.log("Add to quotation:", tile);
                  }}
                >
                  Add to Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTiles.length === 0 && (
        <div className="text-center py-12">
          <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No tiles found</h3>
          <p className="text-gray-500">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};

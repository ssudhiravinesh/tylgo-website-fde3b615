
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Grid3X3, QrCode, Ruler, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tile {
  id: string;
  code: string;
  name: string;
  size_length: number;
  size_breadth: number;
  price_per_sqm: number;
  image_url: string | null;
}

interface TileCatalogProps {
  userRole: "admin" | "worker";
}

export const TileCatalog = ({ userRole }: TileCatalogProps) => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  useEffect(() => {
    fetchTiles();
  }, []);

  const fetchTiles = async () => {
    try {
      const { data, error } = await supabase
        .from('tiles')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching tiles:', error);
        toast.error('Failed to load tiles');
        return;
      }

      setTiles(data || []);
    } catch (error) {
      console.error('Error fetching tiles:', error);
      toast.error('Failed to load tiles');
    } finally {
      setLoading(false);
    }
  };

  const filteredTiles = tiles.filter(tile =>
    tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tile Catalog</h1>
            <p className="text-gray-600">Loading tiles...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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
                  {tile.size_length} × {tile.size_breadth} cm
                </div>
                
                <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                  <IndianRupee className="h-4 w-4" />
                  {tile.price_per_sqm}/m²
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success(`${tile.name} added to quote`);
                  }}
                >
                  Add to Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTiles.length === 0 && !loading && (
        <div className="text-center py-12">
          <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No tiles found</h3>
          <p className="text-gray-500">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};

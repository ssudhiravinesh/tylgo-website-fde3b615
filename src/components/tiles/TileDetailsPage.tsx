
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Grid3X3, Ruler, IndianRupee, ArrowLeft, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { GridLoader } from "@/components/ui/GridLoader";
import { calculateAreaInSquareFeet, formatArea } from '@/utils/unitConversions';

const fetchTileDetails = async (tileId: string) => {
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .eq('id', tileId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const TileDetailsPage: React.FC = () => {
  const { tileId } = useParams<{ tileId: string }>();

  const { data: tile, isLoading, error } = useQuery({
    queryKey: ['tile', tileId],
    queryFn: () => fetchTileDetails(tileId!),
    enabled: !!tileId,
  });

  const handleShare = async () => {
    if (navigator.share && tile) {
      try {
        await navigator.share({
          title: tile.code,
          text: `Check out this tile: ${tile.code}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleDownloadQR = () => {
    if (tile?.qr_code_url) {
      const link = document.createElement('a');
      link.href = tile.qr_code_url;
      link.download = `${tile.code}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return <GridLoader loadingText="Loading tile details..." />;
  }

  if (error || !tile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Tile Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              The requested tile could not be found.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate tile area in square feet (converting from mm)
  const tileAreaSqFt = ((tile.size_length * tile.size_breadth) / 1000000) * 10.764; // Convert m² to sq ft

  // Calculate price per square foot using available data
  const calculatePricePerSqFt = () => {
    if (!tile.price_per_box || !tile.pieces_per_box || !tile.size_length || !tile.size_breadth) {
      return 0;
    }

    const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000; // Convert mm² to m²
    const areaPerBoxSqFt = (tileAreaSqm * tile.pieces_per_box) * 10.764; // Convert to sq ft
    return tile.price_per_box / areaPerBoxSqFt;
  };

  const pricePerSqFt = calculatePricePerSqFt();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Tile Image */}
          <Card>
            <CardContent className="p-6">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                {tile.image_url ? (
                  <img
                    src={tile.image_url}
                    alt={tile.code}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Grid3X3 className="h-24 w-24 text-gray-400" />
                )}
              </div>

              {tile.qr_code_url && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">QR Code</p>
                  <div className="inline-flex flex-col items-center gap-2">
                    <img
                      src={tile.qr_code_url}
                      alt="QR Code"
                      className="w-32 h-32 border rounded-lg"
                    />
                    <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                      <Download className="h-4 w-4 mr-2" />
                      Download QR
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tile Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono">
                    {tile.code}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{tile.code}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Ruler className="h-4 w-4" />
                    <span className="text-sm">Dimensions</span>
                  </div>
                  <div className="text-sm font-medium">
                    {tile.size_length} × {tile.size_breadth} mm
                  </div>
                </div>

                <Separator />

                {pricePerSqFt > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <IndianRupee className="h-4 w-4" />
                        <span className="text-sm">Price per sq ft</span>
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        ₹{pricePerSqFt.toFixed(2)}
                      </div>
                    </div>

                    <Separator />
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm text-gray-600">Area per tile</div>
                  <div className="text-sm font-medium">
                    {tileAreaSqFt.toFixed(4)} sq ft
                  </div>
                </div>

                {pricePerSqFt > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-sm text-gray-600">Price per tile</div>
                    <div className="text-sm font-medium text-green-600">
                      ₹{(pricePerSqFt * tileAreaSqFt).toFixed(2)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Calculate for Your Space (Square Feet)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Length (ft)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.0"
                        id="length-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Width (ft)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.0"
                        id="width-input"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      const length = parseFloat((document.getElementById('length-input') as HTMLInputElement)?.value || '0');
                      const width = parseFloat((document.getElementById('width-input') as HTMLInputElement)?.value || '0');
                      const area = length * width;
                      const tilesNeeded = Math.ceil(area / tileAreaSqFt);

                      if (area > 0 && pricePerSqFt > 0) {
                        const totalCost = area * pricePerSqFt;
                        toast.success(
                          `For ${formatArea(area)}: ${tilesNeeded} tiles needed, Total cost: ₹${totalCost.toFixed(2)}`,
                          { duration: 5000 }
                        );
                      } else if (area > 0) {
                        toast.success(
                          `For ${formatArea(area)}: ${tilesNeeded} tiles needed`,
                          { duration: 5000 }
                        );
                      } else {
                        toast.error('Please enter valid dimensions');
                      }
                    }}
                  >
                    Calculate Cost
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

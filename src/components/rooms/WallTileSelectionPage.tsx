import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Layers, Copy, Minus, Plus, RotateCcw, Eye, QrCode } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { Html5QRScanner } from "@/components/qr/Html5QRScanner";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import { type WallTileSelection, type WallTileLayer } from "@/utils/tileCalculations";

interface WallTileSelectionPageProps {
  room: Room;
  wallSelection: WallTileSelection;
  tiles: Tile[];
  onBack: () => void;
  onUpdateSelection: (selection: WallTileSelection) => void;
}

export const WallTileSelectionPage = ({ 
  room, 
  wallSelection, 
  tiles, 
  onBack, 
  onUpdateSelection 
}: WallTileSelectionPageProps) => {
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [catalogContext, setCatalogContext] = useState<{
    layerNumber?: number;
    isBaseSelection?: boolean;
  } | null>(null);
  const [originalLayers, setOriginalLayers] = useState<WallTileLayer[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize originalLayers from existing wallSelection when component loads
  useEffect(() => {
    if (wallSelection.layers.length > 0 && originalLayers.length === 0) {
      setOriginalLayers([...wallSelection.layers]);
    }
  }, [wallSelection.layers, originalLayers.length]);

  const calculateWallLayers = (baseTileId: string) => {
    const baseTile = tiles.find(t => t.id === baseTileId);
    
    if (!room || !baseTile) return;

    const wallHeight = room.wall_height || 0;
    const wallLength = room.wall_length || room.length || 0;
    
    // Convert tile dimensions from mm to the room's unit - FOR HORIZONTAL PLACEMENT
    let tileHeightInRoomUnit: number;
    let tileLengthInRoomUnit: number;
    
    if (room.unit === "feet") {
      // For horizontal placement: breadth becomes width, length becomes height
      tileHeightInRoomUnit = (baseTile.size_breadth || 0) / 304.8; // mm to feet
      tileLengthInRoomUnit = (baseTile.size_length || 0) / 304.8;
    } else if (room.unit === "metre") {
      // For horizontal placement: breadth becomes width, length becomes height
      tileHeightInRoomUnit = (baseTile.size_breadth || 0) / 1000; // mm to metres
      tileLengthInRoomUnit = (baseTile.size_length || 0) / 1000;
    } else {
      // For horizontal placement: breadth becomes width, length becomes height
      tileHeightInRoomUnit = baseTile.size_breadth || 0; // mm
      tileLengthInRoomUnit = baseTile.size_length || 0;
    }

    const layerCount = Math.ceil(wallHeight / tileHeightInRoomUnit);
    const tilesPerLayer = Math.ceil(wallLength / tileLengthInRoomUnit);

    const layers: WallTileLayer[] = [];
    for (let i = 1; i <= layerCount; i++) {
      layers.push({
        layerNumber: i,
        tileId: baseTileId,
        tilesNeeded: tilesPerLayer
      });
    }

    const updatedSelection = {
      ...wallSelection,
      baseTileId,
      layers,
      totalLayers: layerCount
    };

    // Store original layers for reset functionality
    setOriginalLayers(layers);
    onUpdateSelection(updatedSelection);
  };

  const handleTileSelected = (tileId: string) => {
    if (!catalogContext) return;

    if (catalogContext.isBaseSelection) {
      // Setting base tile for the first time
      calculateWallLayers(tileId);
      toast.success("Base wall tile selected and layers calculated");
    } else if (catalogContext.layerNumber !== undefined) {
      // Changing tile for specific layer
      const updatedLayers = wallSelection.layers.map(layer =>
        layer.layerNumber === catalogContext.layerNumber
          ? { ...layer, tileId }
          : layer
      );
      
      const updatedSelection = {
        ...wallSelection,
        layers: updatedLayers
      };
      
      onUpdateSelection(updatedSelection);
      toast.success(`Tile updated for layer ${catalogContext.layerNumber}`);
    }

    setShowTileCatalog(false);
    setCatalogContext(null);
  };

  const handleChangeLayerTile = (layerNumber: number) => {
    setCatalogContext({ layerNumber });
    setShowTileCatalog(true);
  };

  const handleCopyTileToAllLayers = (tileId: string) => {
    const updatedLayers = wallSelection.layers.map(layer => ({ 
      ...layer, 
      tileId 
    }));
    
    const updatedSelection = {
      ...wallSelection,
      layers: updatedLayers
    };
    
    onUpdateSelection(updatedSelection);
    toast.success("Tile copied to all layers");
  };

  const handleDeleteLayer = (layerNumber: number) => {
    if (wallSelection.layers.length <= 1) {
      toast.error("Cannot delete the last layer");
      return;
    }

    const updatedLayers = wallSelection.layers.filter(layer => 
      layer.layerNumber !== layerNumber
    );
    
    const updatedSelection = {
      ...wallSelection,
      layers: updatedLayers,
      totalLayers: Math.max(1, wallSelection.totalLayers - 1)
    };
    
    onUpdateSelection(updatedSelection);
    toast.success(`Layer ${layerNumber} deleted`);
  };

  const handleAddLayer = () => {
    const maxLayerNumber = Math.max(...wallSelection.layers.map(l => l.layerNumber));
    const newLayer: WallTileLayer = {
      layerNumber: maxLayerNumber + 1,
      tileId: wallSelection.baseTileId || wallSelection.layers[0]?.tileId || '',
      tilesNeeded: wallSelection.layers[0]?.tilesNeeded || 0
    };

    const updatedSelection = {
      ...wallSelection,
      layers: [...wallSelection.layers, newLayer],
      totalLayers: wallSelection.totalLayers + 1
    };

    onUpdateSelection(updatedSelection);
    toast.success("New layer added");
  };

  const handleSelectBaseTile = () => {
    setCatalogContext({ isBaseSelection: true });
    setShowTileCatalog(true);
  };

  const handleQRScan = (tileCode: string) => {
    console.log('QR Code scanned in wall selection:', tileCode);
    
    if (!tileCode || tileCode.trim() === '') {
      toast.error('Invalid QR code. Please try again.');
      return;
    }

    const normalizedCode = tileCode.trim();
    
    // Find matching tile
    const matchingTile = tiles.find(tile => 
      tile.code?.toLowerCase() === normalizedCode.toLowerCase()
    );
    
    if (matchingTile) {
      if (catalogContext?.isBaseSelection) {
        // Setting base tile via QR
        calculateWallLayers(matchingTile.id);
        toast.success(`Base wall tile selected: ${matchingTile.name}`);
      } else if (catalogContext?.layerNumber !== undefined) {
        // Changing tile for specific layer via QR
        const updatedLayers = wallSelection.layers.map(layer =>
          layer.layerNumber === catalogContext.layerNumber
            ? { ...layer, tileId: matchingTile.id }
            : layer
        );
        
        const updatedSelection = {
          ...wallSelection,
          layers: updatedLayers
        };
        
        onUpdateSelection(updatedSelection);
        toast.success(`Tile updated for layer ${catalogContext.layerNumber}: ${matchingTile.name}`);
      } else {
        // No specific context, treat as base tile selection
        calculateWallLayers(matchingTile.id);
        toast.success(`Base wall tile selected: ${matchingTile.name}`);
      }
      
      // Close scanner and clear context
      setShowQRScanner(false);
      setCatalogContext(null);
    } else {
      toast.error(`No tile found with code "${tileCode}". Please try manual selection.`);
    }
  };

  const handleScanQRForBaseTile = () => {
    setCatalogContext({ isBaseSelection: true });
    setShowQRScanner(true);
  };

  const handleScanQRForLayer = (layerNumber: number) => {
    setCatalogContext({ layerNumber });
    setShowQRScanner(true);
  };

  const handleResetLayers = () => {
    if (originalLayers.length === 0) {
      toast.error("No original configuration to reset to");
      return;
    }

    const updatedSelection = {
      ...wallSelection,
      layers: [...originalLayers],
      totalLayers: originalLayers.length
    };

    onUpdateSelection(updatedSelection);
    toast.success("Layers reset to original configuration");
  };

  const generateWallPreview = () => {
    if (!canvasRef.current || wallSelection.layers.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tilesPerLayer = 6; // Fixed to 6 tiles per layer as requested
    
    // Calculate tile dimensions based on the first tile's actual size - HORIZONTAL PLACEMENT
    const firstTile = tiles.find(t => t.id === wallSelection.layers[0]?.tileId);
    if (!firstTile) return;
    
    const tileLength = firstTile.size_length || 600; // Default to 600mm if not specified
    const tileBreadth = firstTile.size_breadth || 600; // Default to 600mm if not specified
    
    // Calculate aspect ratio for HORIZONTAL placement (breadth becomes width, length becomes height)
    const aspectRatio = tileBreadth / tileLength; // Same as floor preview logic
    
    // Base size for display (we'll scale from this)
    const baseSize = 100;
    
    // Calculate actual display dimensions maintaining aspect ratio - HORIZONTAL ORIENTATION
    let tileWidth, tileHeight;
    if (aspectRatio > 1) {
      // Breadth is greater than length (rectangular, longer horizontally)
      tileWidth = baseSize;
      tileHeight = baseSize / aspectRatio;
    } else {
      // Length is greater than or equal to breadth (square or rectangular, longer vertically)
      tileHeight = baseSize;
      tileWidth = baseSize * aspectRatio;
    }
    
    const canvasWidth = tilesPerLayer * tileWidth;
    const canvasHeight = wallSelection.layers.length * tileHeight;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas with better background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const sortedLayers = [...wallSelection.layers].sort((a, b) => a.layerNumber - b.layerNumber);
    let loadedImages = 0;
    const totalImages = sortedLayers.length * tilesPerLayer;
    
    const drawTile = (x: number, y: number, tile: any, layer: any) => {
      if (tile.image_url && tile.image_url.trim() !== '') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // Ensure image is fully loaded before drawing
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              ctx.drawImage(img, x, y, tileWidth, tileHeight);
              // Add subtle border
              ctx.strokeStyle = '#d1d5db';
              ctx.lineWidth = 1;
              ctx.strokeRect(x, y, tileWidth, tileHeight);
            } else {
              drawFallbackTile(x, y, tile, layer);
            }
            
            loadedImages++;
            if (loadedImages === totalImages) {
              addLayerLabels();
            }
          } catch (error) {
            console.error('Error drawing image for tile:', tile.code, error);
            drawFallbackTile(x, y, tile, layer);
          }
        };
        
        img.onerror = (error) => {
          console.error('Failed to load image for tile:', tile.code, tile.image_url, error);
          drawFallbackTile(x, y, tile, layer);
        };
        
        // Add timeout to prevent hanging
        setTimeout(() => {
          if (!img.complete || img.naturalWidth === 0) {
            console.warn('Image loading timeout for tile:', tile.code, tile.image_url);
            drawFallbackTile(x, y, tile, layer);
          }
        }, 5000);
        
        // Start loading the image
        try {
          img.src = tile.image_url;
        } catch (error) {
          console.error('Error setting image src for tile:', tile.code, error);
          drawFallbackTile(x, y, tile, layer);
        }
      } else {
        drawFallbackTile(x, y, tile, layer);
      }
    };

    const drawFallbackTile = (x: number, y: number, tile: any, layer: any) => {
      // Draw colored rectangle with better styling using horizontal dimensions
      const hue = (layer.layerNumber * 60) % 360;
      ctx.fillStyle = `hsl(${hue}, 60%, 75%)`;
      ctx.fillRect(x, y, tileWidth, tileHeight);
      
      // Add horizontal grain pattern effect adjusted for horizontal tile dimensions
      ctx.strokeStyle = `hsl(${hue}, 50%, 65%)`;
      ctx.lineWidth = 1;
      const grainLines = Math.max(2, Math.floor(tileHeight / 25)); // Adjust grain lines for horizontal layout
      for (let i = 0; i < grainLines; i++) {
        const lineY = y + (i * tileHeight / grainLines) + (tileHeight / grainLines / 2);
        ctx.beginPath();
        ctx.moveTo(x + 5, lineY);
        ctx.lineTo(x + tileWidth - 5, lineY);
        ctx.stroke();
      }
      
      // Add border
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileWidth, tileHeight);
      
      // Add tile code text with better styling - adjust font size based on horizontal tile dimensions
      ctx.fillStyle = '#374151';
      const fontSize = Math.min(tileWidth, tileHeight) * 0.12; // Scale font size with tile size
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Break long tile codes into multiple lines for better readability
      const code = tile.code || tile.name || 'Unknown';
      const maxLength = Math.floor(tileWidth / 8); // Adjust max length based on tile width
      
      if (code.length > maxLength) {
        const firstLine = code.substring(0, maxLength);
        const secondLine = code.substring(maxLength, maxLength * 2);
        ctx.fillText(firstLine, x + tileWidth/2, y + tileHeight/2 - fontSize/2);
        if (secondLine) {
          ctx.fillText(secondLine, x + tileWidth/2, y + tileHeight/2 + fontSize/2);
        }
      } else {
        ctx.fillText(code, x + tileWidth/2, y + tileHeight/2);
      }
      
      loadedImages++;
      if (loadedImages === totalImages) {
        addLayerLabels();
      }
    };

    const addLayerLabels = () => {
      // Add layer numbers on the left side
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      sortedLayers.forEach((layer, layerIndex) => {
        const y = layerIndex * tileHeight;
        ctx.fillText(`L${layer.layerNumber}`, -8, y + tileHeight/2);
      });
    };
    
    // Draw all tiles with horizontal dimensions
    sortedLayers.forEach((layer, layerIndex) => {
      const tile = tiles.find(t => t.id === layer.tileId);
      if (!tile) {
        console.warn('Tile not found for layer:', layer.layerNumber, 'tileId:', layer.tileId);
        return;
      }

      const y = layerIndex * tileHeight;
      
      for (let tileIndex = 0; tileIndex < tilesPerLayer; tileIndex++) {
        const x = tileIndex * tileWidth;
        drawTile(x, y, tile, layer);
      }
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
    // Generate preview after a short delay to ensure dialog is open
    setTimeout(() => generateWallPreview(), 100);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-800">Configure Wall Tiles</h2>
          <p className="text-gray-600">{room.name} - Layer Management</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Room Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Room Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg">{room.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p>Wall Height: {room.wall_height || 'Not specified'} {room.unit}</p>
                <p>Wall Length: {room.wall_length || room.length || 'Not specified'} {room.unit}</p>
                <p>Wall Area: {((room.wall_height || 0) * (room.wall_length || room.length || 0)).toFixed(2)} sq {room.unit}</p>
              </div>
            </div>

            {!wallSelection.baseTileId ? (
              <div className="space-y-2">
                <Button 
                  onClick={handleSelectBaseTile}
                  className="w-full"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Select Base Tile
                </Button>
                <Button 
                  onClick={handleScanQRForBaseTile}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Layers:</span>
                  <Badge variant="secondary">{wallSelection.totalLayers}</Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handlePreview}
                    className="flex-1"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Wall
                  </Button>
                  <Button 
                    onClick={handleResetLayers}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Layer Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-green-600" />
                Layer Configuration
              </span>
              {wallSelection.layers.length > 0 && (
                <Button 
                  onClick={handleAddLayer}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wallSelection.layers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Layers className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a base tile to start configuring layers</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {wallSelection.layers
                  .sort((a, b) => a.layerNumber - b.layerNumber)
                  .map((layer) => {
                    const tile = tiles.find(t => t.id === layer.tileId);
                    return (
                      <div key={layer.layerNumber} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Layer {layer.layerNumber}</Badge>
                            <span className="text-sm text-gray-600">
                              {layer.tilesNeeded} tiles needed
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => handleScanQRForLayer(layer.layerNumber)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleChangeLayerTile(layer.layerNumber)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <Layers className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleCopyTileToAllLayers(layer.tileId)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteLayer(layer.layerNumber)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded border">
                          <div className="flex items-center gap-3">
                            {tile?.image_url && (
                              <img 
                                src={tile.image_url} 
                                alt={tile.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium">{tile?.name || 'Unknown Tile'}</h4>
                              <p className="text-sm text-gray-600">{tile?.code || 'No Code'}</p>
                              <p className="text-xs text-gray-500">
                                {tile?.size_length}mm × {tile?.size_breadth}mm
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Wall Preview - {room.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Preview shows 6 tiles per layer in horizontal orientation
              </p>
              <div className="border-2 border-dashed border-gray-300 p-4 bg-white rounded">
                <canvas 
                  ref={canvasRef}
                  className="max-w-full h-auto border"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Total Layers: {wallSelection.layers.length}</p>
              <p>Tiles per Layer: 6 (horizontal placement)</p>
              <p>Total Tiles: {wallSelection.layers.reduce((sum, layer) => sum + layer.tilesNeeded, 0)}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tile Catalog Dialog */}
      <Dialog open={showTileCatalog} onOpenChange={setShowTileCatalog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Tile</DialogTitle>
          </DialogHeader>
          <TileCatalog 
            tiles={tiles}
            onTileSelect={handleTileSelected}
            selectedTileId={null}
          />
        </DialogContent>
      </Dialog>

      {/* QR Scanner Dialog */}
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Tile QR Code</DialogTitle>
          </DialogHeader>
          <Html5QRScanner
            onScan={handleQRScan}
            onError={(error) => {
              console.error('QR Scanner error:', error);
              toast.error('QR Scanner error. Please try again.');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
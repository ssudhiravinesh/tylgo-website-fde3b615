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
    
    // Convert tile dimensions from mm to the room's unit
    let tileHeightInRoomUnit: number;
    let tileLengthInRoomUnit: number;
    
    if (room.unit === "feet") {
      tileHeightInRoomUnit = (baseTile.size_length || 0) / 304.8; // mm to feet
      tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 304.8;
    } else if (room.unit === "metre") {
      tileHeightInRoomUnit = (baseTile.size_length || 0) / 1000; // mm to metres
      tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 1000;
    } else {
      tileHeightInRoomUnit = baseTile.size_length || 0; // mm
      tileLengthInRoomUnit = baseTile.size_breadth || 0;
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

    // High-DPI canvas setup
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Calculate target canvas width (90% of dialog width)
    const dialogWidth = Math.min(window.innerWidth * 0.95, 1200);
    const targetCanvasWidth = dialogWidth * 0.9;
    
    // Calculate tile dimensions based on the first tile's actual size
    const firstTile = tiles.find(t => t.id === wallSelection.layers[0]?.tileId);
    if (!firstTile) return;
    
    const tileLength = firstTile.size_length || 600;
    const tileBreadth = firstTile.size_breadth || 600;
    
    // Calculate aspect ratio (preserve at all costs)
    const aspectRatio = tileBreadth / tileLength;
    
    // Dynamically set tiles per layer based on tile orientation for better canvas utilization
    // For vertical tiles (tall), use fewer tiles per layer
    // For horizontal tiles (wide), use more tiles per layer
    let tilesPerLayer;
    if (aspectRatio > 1) {
      // Vertical tiles (taller than wide): 4 tiles per layer
      tilesPerLayer = 4;
    } else {
      // Horizontal or square tiles: 6 tiles per layer
      tilesPerLayer = 6;
    }
    
    const layerCount = wallSelection.layers.length;
    
    // Calculate tile width to fill 90% of dialog width
    const tileWidth = targetCanvasWidth / tilesPerLayer;
    
    // Calculate tile height maintaining aspect ratio
    const tileHeight = tileWidth * aspectRatio;
    
    // Calculate required canvas height
    const requiredHeight = layerCount * tileHeight;
    
    // Apply vertical scaling if needed to fit in viewport
    const maxHeight = window.innerHeight * 0.7;
    const verticalScale = Math.min(1.0, maxHeight / requiredHeight);
    
    // Final dimensions
    const canvasWidth = targetCanvasWidth;
    const canvasHeight = requiredHeight * verticalScale;
    const scaledTileWidth = tileWidth;
    const scaledTileHeight = tileHeight * verticalScale;
    
    // High-DPI canvas setup for crisp images
    const setupHighDPICanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = canvasWidth + 'px';
      canvas.style.height = canvasHeight + 'px';
      ctx.scale(dpr, dpr);
      
      // Better image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };
    
    setupHighDPICanvas();

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
              // Use createImageBitmap for better quality if available
              if (window.createImageBitmap) {
                createImageBitmap(img, {
                  resizeWidth: Math.max(scaledTileWidth * devicePixelRatio, 256),
                  resizeHeight: Math.max(scaledTileHeight * devicePixelRatio, 256),
                  resizeQuality: 'high'
                }).then(bitmap => {
                  ctx.drawImage(bitmap, x, y, scaledTileWidth, scaledTileHeight);
                  // Add subtle border with device pixel ratio adjustment
                  ctx.strokeStyle = '#d1d5db';
                  ctx.lineWidth = 1 / devicePixelRatio;
                  ctx.strokeRect(x, y, scaledTileWidth, scaledTileHeight);
                  bitmap.close();
                  
                  loadedImages++;
                  if (loadedImages === totalImages) {
                    addLayerLabels();
                  }
                }).catch(() => {
                  // Fallback to regular drawImage
                  ctx.drawImage(img, x, y, scaledTileWidth, scaledTileHeight);
                  ctx.strokeStyle = '#d1d5db';
                  ctx.lineWidth = 1 / devicePixelRatio;
                  ctx.strokeRect(x, y, scaledTileWidth, scaledTileHeight);
                  
                  loadedImages++;
                  if (loadedImages === totalImages) {
                    addLayerLabels();
                  }
                });
              } else {
                // Fallback for browsers without createImageBitmap
                ctx.drawImage(img, x, y, scaledTileWidth, scaledTileHeight);
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1 / devicePixelRatio;
                ctx.strokeRect(x, y, scaledTileWidth, scaledTileHeight);
                
                loadedImages++;
                if (loadedImages === totalImages) {
                  addLayerLabels();
                }
              }
            } else {
              drawFallbackTile(x, y, tile, layer);
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
      // Draw colored rectangle with better styling using actual dimensions
      const hue = (layer.layerNumber * 60) % 360;
      ctx.fillStyle = `hsl(${hue}, 60%, 75%)`;
      ctx.fillRect(x, y, scaledTileWidth, scaledTileHeight);
      
      // Add border with device pixel ratio adjustment
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2 / devicePixelRatio;
      ctx.strokeRect(x, y, scaledTileWidth, scaledTileHeight);
      
      // Add tile code text with better styling - adjust font size based on tile dimensions
      ctx.fillStyle = '#374151';
      const fontSize = Math.min(scaledTileWidth, scaledTileHeight) * 0.12; // Scale font size with tile size
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Break long tile codes into multiple lines for better readability
      const code = tile.code || tile.name || 'Unknown';
      const maxLength = Math.floor(scaledTileWidth / 8); // Adjust max length based on tile width
      
      if (code.length > maxLength) {
        const firstLine = code.substring(0, maxLength);
        const secondLine = code.substring(maxLength, maxLength * 2);
        ctx.fillText(firstLine, x + scaledTileWidth/2, y + scaledTileHeight/2 - fontSize/2);
        if (secondLine) {
          ctx.fillText(secondLine, x + scaledTileWidth/2, y + scaledTileHeight/2 + fontSize/2);
        }
      } else {
        ctx.fillText(code, x + scaledTileWidth/2, y + scaledTileHeight/2);
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
        const y = layerIndex * scaledTileHeight;
        ctx.fillText(`L${layer.layerNumber}`, -8, y + scaledTileHeight/2);
      });
    };
    
    // Draw all tiles with actual dimensions
    sortedLayers.forEach((layer, layerIndex) => {
      const tile = tiles.find(t => t.id === layer.tileId);
      if (!tile) {
        console.warn('Tile not found for layer:', layer.layerNumber, 'tileId:', layer.tileId);
        return;
      }

      const y = layerIndex * scaledTileHeight;
      
      for (let tileIndex = 0; tileIndex < tilesPerLayer; tileIndex++) {
        const x = tileIndex * scaledTileWidth;
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
                <div className="flex justify-between items-center">
                  <span className="font-medium">Layers: {wallSelection.layers.length}</span>
                  <Button 
                    onClick={handleAddLayer}
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Layer
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
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-green-600" />
                Layer Configuration
              </div>
              {wallSelection.layers.length > 0 && originalLayers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetLayers}
                  className="gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wallSelection.layers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-center mb-3">
                  <Button
                    onClick={handlePreview}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 text-white" />
                    Preview Wall
                  </Button>

                </div>
                <div className="max-h-80 overflow-y-auto">
                  {wallSelection.layers
                    .sort((a, b) => a.layerNumber - b.layerNumber)
                    .map(layer => {
                    const tile = tiles.find(t => t.id === layer.tileId);
                    return tile ? (
                      <div key={layer.layerNumber} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Layer {layer.layerNumber}
                            </Badge>
                          </div>
                          <p className="font-medium truncate">{tile.name}</p>
                          <p className="text-sm text-gray-500">{tile.code}</p>
                          <p className="text-xs text-gray-400">
                            {layer.tilesNeeded} tiles needed
                          </p>
                        </div>
                        
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleChangeLayerTile(layer.layerNumber)}
                            className="h-8 w-8 p-0"
                            title="Change tile"
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleScanQRForLayer(layer.layerNumber)}
                            className="h-8 w-8 p-0"
                            title="Scan QR for this layer"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyTileToAllLayers(layer.tileId)}
                            className="h-8 w-8 p-0"
                            title="Copy to all layers"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {wallSelection.layers.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteLayer(layer.layerNumber)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              title="Delete layer"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : null;
                   })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Layers className="h-12 w-12 mx-auto mb-4" />
                <p>Select a base tile to start configuring layers</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tile Catalog Dialog */}
      <Dialog open={showTileCatalog} onOpenChange={setShowTileCatalog}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {catalogContext?.isBaseSelection 
                ? "Select Base Tile for Wall" 
                : `Select Tile for Layer ${catalogContext?.layerNumber}`
              }
            </DialogTitle>
          </DialogHeader>
          <TileCatalog 
            isSelectionMode={true}
            onTileSelect={handleTileSelected}
          />
        </DialogContent>
      </Dialog>

      {/* QR Scanner Dialog */}
      <Html5QRScanner
        isOpen={showQRScanner}
        onClose={() => {
          setShowQRScanner(false);
          setCatalogContext(null);
        }}
        onScan={handleQRScan}
      />

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-4">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">
              Wall Preview - {wallSelection.layers.length} Layer{wallSelection.layers.length > 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="border-2 border-gray-200 rounded-lg bg-white shadow-lg flex items-center justify-center p-4 max-w-full max-h-full">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full block"
                  style={{ 
                    imageRendering: 'crisp-edges'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 text-center pt-4 border-t">
            <p className="font-medium">
              Preview shows 6 tiles per layer maintaining actual proportions
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Layers stack from bottom (L1) to top • Auto-scaled for {wallSelection.layers.length} layers
            </p>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

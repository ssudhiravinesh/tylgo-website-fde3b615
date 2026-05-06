import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Layers, Copy, Minus, Plus, RotateCcw, Eye, QrCode, Box } from "lucide-react";
import { RoomVisualizer } from "./RoomVisualizer";
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
  const [showRoomView, setShowRoomView] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert wall layers to VisTile array for the 3D visualizer
  const wallVisLayers = [...wallSelection.layers]
    .sort((a, b) => a.layerNumber - b.layerNumber)
    .map(layer => tiles.find(t => t.id === layer.tileId))
    .filter((t): t is Tile => !!t);

  // Initialize originalLayers from existing wallSelection when component mounts
  // Use a ref to track whether we've captured the initial snapshot
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && wallSelection.layers.length > 0) {
      setOriginalLayers([...wallSelection.layers]);
      hasInitializedRef.current = true;
    }
  }, [wallSelection.layers]);

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

    // -------------------------------------------------------------
    // FIX: Area-Based Calculation Logic (No Double Rounding)
    // -------------------------------------------------------------

    // 1. Calculate Grand Total based on Area
    const totalWallArea = wallHeight * wallLength;
    const singleTileArea = tileHeightInRoomUnit * tileLengthInRoomUnit;

    // Safety check to avoid division by zero
    if (singleTileArea <= 0) {
      console.error("Invalid tile dimensions");
      return;
    }

    const grandTotalTilesNeeded = Math.ceil(totalWallArea / singleTileArea);

    // 2. Calculate Visual Layers (Rows)
    // We still need layers for visual representation and different tile assignments
    const layerCount = Math.max(1, Math.ceil(wallHeight / tileHeightInRoomUnit));

    // 3. Distribute Grand Total across Layers
    // Instead of rounding per row, we use the precise fraction so the sum is exact.
    const tilesPerLayer = grandTotalTilesNeeded / layerCount;

    const layers: WallTileLayer[] = [];
    for (let i = 1; i <= layerCount; i++) {
      layers.push({
        layerNumber: i,
        tileId: baseTileId,
        tilesNeeded: tilesPerLayer // This might be a float (e.g. 12.75), which is correct for pricing
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
        toast.success(`Base wall tile selected: ${matchingTile.code}`);
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
        toast.success(`Tile updated for layer ${catalogContext.layerNumber}: ${matchingTile.code}`);
      } else {
        // No specific context, treat as base tile selection
        calculateWallLayers(matchingTile.id);
        toast.success(`Base wall tile selected: ${matchingTile.code}`);
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

  /* ============================================================
     Industrial Craft — Wall Preview Canvas Renderer
     ============================================================ */
  const WALL_PREVIEW = {
    grout: { color: '#C8BFB3', width: 2 },
    backdrop: '#F5F2ED',
    fallback: {
      fills: ['#E8E2D9', '#DED6C8', '#D4CCC0', '#E2DDD5', '#DAD3C7', '#E5DFD6'],
      textColor: '#4A4541',
      codeBg: 'rgba(74, 69, 65, 0.06)',
    },
    font: { family: 'Manrope, system-ui, sans-serif', weight: '600', sizeRatio: 0.11 },
    padding: 32,
    labelWidth: 48,
  } as const;

  const generateWallPreview = () => {
    if (!canvasRef.current || wallSelection.layers.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const firstTile = tiles.find(t => t.id === wallSelection.layers[0]?.tileId);
    if (!firstTile) return;

    const tileLength = firstTile.size_length || 600;
    const tileBreadth = firstTile.size_breadth || 600;
    const aspectRatio = tileBreadth / tileLength;

    const tilesPerLayer = 6;
    const baseSize = 200;
    let tileWidth: number, tileHeight: number;

    if (aspectRatio > 1) {
      tileWidth = baseSize;
      tileHeight = baseSize / aspectRatio;
    } else {
      tileHeight = baseSize;
      tileWidth = baseSize * aspectRatio;
    }

    const layerCount = wallSelection.layers.length;
    const groutW = WALL_PREVIEW.grout.width;
    const pad = WALL_PREVIEW.padding;
    const labelW = WALL_PREVIEW.labelWidth;

    // Field dimensions including grout
    const fieldW = tilesPerLayer * tileWidth + (tilesPerLayer + 1) * groutW;
    const fieldH = layerCount * tileHeight + (layerCount + 1) * groutW;

    const requiredWidth = labelW + pad + fieldW + pad;
    const requiredHeight = pad + fieldH + pad;

    const maxW = Math.min(window.innerWidth * 0.85, 1100);
    const maxH = Math.min(window.innerHeight * 0.65, 800);

    const scale = Math.min(maxW / requiredWidth, maxH / requiredHeight, 1);

    const displayWidth = requiredWidth * scale;
    const displayHeight = requiredHeight * scale;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Backdrop
    ctx.fillStyle = WALL_PREVIEW.backdrop;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const fieldX = (labelW + pad) * scale;
    const fieldY = pad * scale;
    const scaledFieldW = fieldW * scale;
    const scaledFieldH = fieldH * scale;

    // Drop shadow behind wall
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
    ctx.shadowBlur = 28 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6 * scale;
    ctx.fillStyle = WALL_PREVIEW.grout.color;
    ctx.fillRect(fieldX, fieldY, scaledFieldW, scaledFieldH);
    ctx.restore();

    // Grout base
    ctx.fillStyle = WALL_PREVIEW.grout.color;
    ctx.fillRect(fieldX, fieldY, scaledFieldW, scaledFieldH);

    const scaledTileW = tileWidth * scale;
    const scaledTileH = tileHeight * scale;
    const scaledGrout = groutW * scale;

    // Depth helper
    const addTileDepth = (x: number, y: number, w: number, h: number) => {
      const topGrad = ctx.createLinearGradient(x, y, x, y + h * 0.12);
      topGrad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
      topGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(x, y, w, h * 0.12);

      const btmGrad = ctx.createLinearGradient(x, y + h * 0.88, x, y + h);
      btmGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      btmGrad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
      ctx.fillStyle = btmGrad;
      ctx.fillRect(x, y + h * 0.88, w, h * 0.12);
    };

    // Sort layers and reverse for bottom-up (Layer 1 at bottom)
    const sortedLayers = [...wallSelection.layers].sort((a, b) => a.layerNumber - b.layerNumber);
    const layersToDraw = [...sortedLayers].reverse();

    let loadedImages = 0;
    const totalImages = layersToDraw.length * tilesPerLayer;

    const checkComplete = () => {
      loadedImages++;
      if (loadedImages >= totalImages) drawLayerLabels();
    };

    // Draw layer labels on the left
    const drawLayerLabels = () => {
      const fontSize = Math.min(13, 11 * scale) * scale;
      ctx.font = `600 ${fontSize}px ${WALL_PREVIEW.font.family}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      layersToDraw.forEach((layer, layerIndex) => {
        const y = fieldY + scaledGrout + layerIndex * (scaledTileH + scaledGrout);
        const labelX = fieldX - 10 * scale;
        const labelY = y + scaledTileH / 2;

        // Pill background
        const text = `L${layer.layerNumber}`;
        const metrics = ctx.measureText(text);
        const pillW = metrics.width + 10 * scale;
        const pillH = fontSize * 1.8;
        const pillX = labelX - pillW;
        const pillY = labelY - pillH / 2;

        ctx.fillStyle = 'rgba(74, 69, 65, 0.07)';
        const r = pillH * 0.3;
        ctx.beginPath();
        ctx.moveTo(pillX + r, pillY);
        ctx.lineTo(pillX + pillW - r, pillY);
        ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + r);
        ctx.lineTo(pillX + pillW, pillY + pillH - r);
        ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH);
        ctx.lineTo(pillX + r, pillY + pillH);
        ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - r);
        ctx.lineTo(pillX, pillY + r);
        ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = WALL_PREVIEW.fallback.textColor;
        ctx.fillText(text, labelX - 5 * scale, labelY);
      });
    };

    const drawWallTile = (x: number, y: number, tileData: Tile, layerIdx: number) => {
      if (tileData.image_url && tileData.image_url.trim() !== '') {
        const img = new Image();

        img.onload = () => {
          try {
            if (img.complete && img.naturalWidth > 0) {
              if (window.createImageBitmap) {
                createImageBitmap(img, {
                  resizeWidth: Math.max(scaledTileW * dpr, 256),
                  resizeHeight: Math.max(scaledTileH * dpr, 256),
                  resizeQuality: 'high'
                }).then(bitmap => {
                  ctx.drawImage(bitmap, x, y, scaledTileW, scaledTileH);
                  addTileDepth(x, y, scaledTileW, scaledTileH);
                  bitmap.close();
                  checkComplete();
                }).catch(() => {
                  ctx.drawImage(img, x, y, scaledTileW, scaledTileH);
                  addTileDepth(x, y, scaledTileW, scaledTileH);
                  checkComplete();
                });
              } else {
                ctx.drawImage(img, x, y, scaledTileW, scaledTileH);
                addTileDepth(x, y, scaledTileW, scaledTileH);
                checkComplete();
              }
            } else {
              drawWallFallback(x, y, tileData, layerIdx);
            }
          } catch {
            drawWallFallback(x, y, tileData, layerIdx);
          }
        };

        img.onerror = () => drawWallFallback(x, y, tileData, layerIdx);
        img.src = tileData.image_url;
      } else {
        drawWallFallback(x, y, tileData, layerIdx);
      }
    };

    const drawWallFallback = (x: number, y: number, tileData: Tile, layerIdx: number) => {
      const fills = WALL_PREVIEW.fallback.fills;
      ctx.fillStyle = fills[layerIdx % fills.length];
      ctx.fillRect(x, y, scaledTileW, scaledTileH);

      // Subtle grain
      ctx.strokeStyle = 'rgba(180, 170, 158, 0.4)';
      ctx.lineWidth = 0.5;
      const lines = Math.max(3, Math.floor(scaledTileH / 18));
      for (let i = 0; i < lines; i++) {
        const ly = y + (i * scaledTileH / lines) + (scaledTileH / lines / 2);
        ctx.beginPath();
        ctx.moveTo(x + 8, ly);
        ctx.lineTo(x + scaledTileW - 8, ly);
        ctx.stroke();
      }

      // Code label
      const fontSize = Math.min(scaledTileW, scaledTileH) * WALL_PREVIEW.font.sizeRatio;
      ctx.font = `${WALL_PREVIEW.font.weight} ${fontSize}px ${WALL_PREVIEW.font.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const code = tileData.code || 'TILE';
      const maxLen = Math.floor(scaledTileW / (fontSize * 0.55));
      const displayCode = code.length > maxLen ? code.substring(0, maxLen) : code;

      // Code pill
      const tm = ctx.measureText(displayCode);
      const pW = tm.width + fontSize * 0.8;
      const pH = fontSize * 1.6;
      const pX = x + scaledTileW / 2 - pW / 2;
      const pY = y + scaledTileH / 2 - pH / 2;
      const pr = pH * 0.25;

      ctx.fillStyle = WALL_PREVIEW.fallback.codeBg;
      ctx.beginPath();
      ctx.moveTo(pX + pr, pY);
      ctx.lineTo(pX + pW - pr, pY);
      ctx.quadraticCurveTo(pX + pW, pY, pX + pW, pY + pr);
      ctx.lineTo(pX + pW, pY + pH - pr);
      ctx.quadraticCurveTo(pX + pW, pY + pH, pX + pW - pr, pY + pH);
      ctx.lineTo(pX + pr, pY + pH);
      ctx.quadraticCurveTo(pX, pY + pH, pX, pY + pH - pr);
      ctx.lineTo(pX, pY + pr);
      ctx.quadraticCurveTo(pX, pY, pX + pr, pY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = WALL_PREVIEW.fallback.textColor;
      ctx.fillText(displayCode, x + scaledTileW / 2, y + scaledTileH / 2);

      addTileDepth(x, y, scaledTileW, scaledTileH);
      checkComplete();
    };

    // Main draw loop — Layer 1 at bottom
    layersToDraw.forEach((layer, layerIndex) => {
      const tileData = tiles.find(t => t.id === layer.tileId);
      if (!tileData) return;

      const y = fieldY + scaledGrout + layerIndex * (scaledTileH + scaledGrout);

      for (let col = 0; col < tilesPerLayer; col++) {
        const x = fieldX + scaledGrout + col * (scaledTileW + scaledGrout);
        drawWallTile(x, y, tileData, layerIndex);
      }
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
    setTimeout(() => generateWallPreview(), 120);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-foreground">Configure Wall Tiles</h2>
          <p className="text-muted-foreground">{room.name} - Layer Management</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Room Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Room Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="font-semibold text-lg">{room.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>Wall Height: {room.wall_height || 'Not specified'} {room.unit}</p>
                <p>Wall Perimeter: {room.wall_length || room.length || 'Not specified'} {room.unit}</p>
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
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
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
                        <div key={layer.layerNumber} className="flex items-center justify-between bg-muted p-3 rounded-lg border">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                Layer {layer.layerNumber}
                              </Badge>
                            </div>
                            <p className="font-medium truncate">{tile.code}</p>
                            <p className="text-sm text-muted-foreground">{tile.code}</p>
                            <p className="text-xs text-muted-foreground/70">
                              {layer.tilesNeeded.toFixed(2)} tiles needed
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
              <div className="text-center py-8 text-muted-foreground/70">
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
        <DialogContent className="max-w-[96vw] w-auto h-auto max-h-[94vh] p-0 rounded-xl overflow-hidden border-border/50 shadow-2xl">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/40 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                  Wall Preview
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                  {wallSelection.layers.length} Layer{wallSelection.layers.length > 1 ? 's' : ''} &middot; {room.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRoomView(true)}
                  className="gap-1.5 text-xs h-8"
                >
                  <Box className="h-3.5 w-3.5" />
                  Room View
                </Button>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 border border-primary/20"
                      style={{ color: 'hsl(32, 88%, 38%)' }}>
                  6 tiles/layer
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Canvas area */}
          <div className="flex items-center justify-center p-6 bg-background min-h-[200px]">
            <canvas
              ref={canvasRef}
              className="block"
              style={{
                imageRendering: 'auto',
                borderRadius: '8px',
              }}
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border/40 bg-card">
            <p className="text-xs text-muted-foreground text-center font-medium">
              Layer 1 at bottom &middot; Actual proportions &middot; Grout simulation
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <RoomVisualizer
        isOpen={showRoomView}
        onClose={() => setShowRoomView(false)}
        wallLayers={wallVisLayers}
        roomName={`${room.name} Wall`}
      />
    </div>
  );
};

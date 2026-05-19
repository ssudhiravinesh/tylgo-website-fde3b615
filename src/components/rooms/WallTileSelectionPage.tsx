import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Layers, Copy, Minus, Plus, RotateCcw, Eye, QrCode, Box, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { RoomVisualizer } from "./RoomVisualizer";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { Html5QRScanner } from "@/components/qr/Html5QRScanner";
import { toast } from "sonner";
import { useDeleteWallTileLayerSelection } from "@/hooks/useRooms";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import { type WallTileSelection, type WallTileLayer } from "@/utils/tileCalculations";

// ---------------------------------------------------------------------------
// Tile Variant Finder
// ---------------------------------------------------------------------------
// ANUJ tile codes follow the pattern:
//   {prefix} {size} ANUJ {number} {variant_suffix}
// e.g. "JW 18X12 ANUJ 1010 LIGHT", "JW 18X12 ANUJ 1010 HL1", "JW 18X12 ANUJ 1010 DARK"
// This utility strips the variant suffix to find sibling tiles in the same series.

const VARIANT_SUFFIX_RE = /\s+(?:LIGHT|DARK|HL\S*|K-?\d\S*)(?:\s+KT)?$/i;
const COMPOUND_KT_RE = /\s+KT$/i;

function extractTileBase(code: string): string | null {
  // First try stripping compound "HL1 KT" / "HLD KT" patterns
  let stripped = code.replace(VARIANT_SUFFIX_RE, '');
  if (stripped !== code) return stripped;

  // Fallback: strip trailing KT alone (some codes end with just KT)
  stripped = code.replace(COMPOUND_KT_RE, '');
  if (stripped !== code) {
    const again = stripped.replace(VARIANT_SUFFIX_RE, '');
    if (again !== stripped) return again;
  }

  return null;
}

interface TileVariant {
  tile: Tile;
  label: string; // e.g. "L", "D", "HL1", "HL2"
}

/** Short display label for a variant suffix */
function variantLabel(code: string, base: string): string {
  const suffix = code.substring(base.length).trim().toUpperCase();
  if (suffix === 'LIGHT') return 'L';
  if (suffix === 'DARK') return 'D';
  return suffix || 'BASE';
}

function findTileVariants(baseTile: Tile, allTiles: Tile[]): TileVariant[] {
  const base = extractTileBase(baseTile.code);
  if (!base) return [];

  return allTiles
    .filter(
      t =>
        t.id !== baseTile.id &&
        (t.code === base || t.code.startsWith(base + ' ')) &&
        t.size_length === baseTile.size_length &&
        t.size_breadth === baseTile.size_breadth
    )
    .map(t => ({ tile: t, label: variantLabel(t.code, base) }))
    .sort((a, b) => {
      // Sort order: L first, then HL variants alphabetically, then D last
      const order = (l: string) => {
        if (l === 'L') return 0;
        if (l === 'D') return 99;
        return 1; // HL variants in the middle
      };
      const diff = order(a.label) - order(b.label);
      return diff !== 0 ? diff : a.label.localeCompare(b.label);
    });
}

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
  const deleteLayerMutation = useDeleteWallTileLayerSelection();

  // Pre-compute variant map: for every tile currently used in a layer,
  // cache its sibling variants so we don't recompute on every render.
  const variantMap = useMemo(() => {
    const map = new Map<string, TileVariant[]>();
    const seen = new Set<string>();
    for (const layer of wallSelection.layers) {
      if (!layer.tileId || seen.has(layer.tileId)) continue;
      seen.add(layer.tileId);
      const tile = tiles.find(t => t.id === layer.tileId);
      if (tile) {
        map.set(tile.id, findTileVariants(tile, tiles));
      }
    }
    return map;
  }, [wallSelection.layers, tiles]);

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

  // Derive wall dimensions from wall_measurements (multi-shape) or legacy single-shape
  const getWallDimensions = () => {
    const measurements = room.wall_measurements;
    if (measurements && Array.isArray(measurements) && measurements.length > 0) {
      // Multi-shape: each measurement is { length: "wallLength", width: "wallHeight" }
      let totalArea = 0;
      let maxHeight = 0;
      measurements.forEach((m: { length: string; width: string }) => {
        const l = parseFloat(m.length) || 0;
        const h = parseFloat(m.width) || 0;
        totalArea += l * h;
        if (h > maxHeight) maxHeight = h;
      });
      return { totalArea, maxHeight };
    }
    // Legacy single-shape fallback
    const wallHeight = room.wall_height || 0;
    const wallLength = room.wall_length || 0;
    return { totalArea: wallHeight * wallLength, maxHeight: wallHeight };
  };

  const { totalArea } = getWallDimensions();

  const calculateWallLayers = (baseTileId: string, orientationOverride?: 'horizontal' | 'vertical') => {
    const baseTile = tiles.find(t => t.id === baseTileId);

    if (!room || !baseTile) return;

    const { totalArea: totalWallArea, maxHeight: wallHeight } = getWallDimensions();

    // Convert tile dimensions from mm to the room's unit.
    // Orientation determines which physical dimension is vertical on the wall:
    //   horizontal (default) → size_breadth is vertical, size_length is horizontal
    //   vertical             → size_length is vertical, size_breadth is horizontal
    const orientation = orientationOverride || wallSelection.orientation || 'horizontal';
    const tileVerticalMm  = orientation === 'horizontal' ? (baseTile.size_breadth || 0) : (baseTile.size_length || 0);
    const tileHorizontalMm = orientation === 'horizontal' ? (baseTile.size_length || 0) : (baseTile.size_breadth || 0);

    let tileHeightInRoomUnit: number; // vertical side of tile on wall
    let tileLengthInRoomUnit: number; // horizontal side of tile on wall

    if (room.unit === "feet") {
      tileHeightInRoomUnit = tileVerticalMm / 304.8; // mm to feet
      tileLengthInRoomUnit = tileHorizontalMm / 304.8;
    } else if (room.unit === "metre") {
      tileHeightInRoomUnit = tileVerticalMm / 1000; // mm to metres
      tileLengthInRoomUnit = tileHorizontalMm / 1000;
    } else {
      tileHeightInRoomUnit = tileVerticalMm; // mm
      tileLengthInRoomUnit = tileHorizontalMm;
    }

    // -------------------------------------------------------------
    // Area-Based Calculation Logic (No Double Rounding)
    // -------------------------------------------------------------

    // 1. Calculate Grand Total based on Area
    const singleTileArea = tileHeightInRoomUnit * tileLengthInRoomUnit;

    // Safety check to avoid division by zero
    if (singleTileArea <= 0) {
      console.error("Invalid tile dimensions");
      return;
    }

    const grandTotalTilesNeeded = Math.ceil(totalWallArea / singleTileArea);

    // 2. Calculate Visual Layers (Rows) based on the tallest wall shape
    const layerCount = wallHeight > 0 && tileHeightInRoomUnit > 0
      ? Math.max(1, Math.round(wallHeight / tileHeightInRoomUnit))
      : 1;

    // 3. Distribute Grand Total across Layers
    const tilesPerLayer = grandTotalTilesNeeded / layerCount;

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
      totalLayers: layerCount,
      orientation,
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

  const handleDeleteLayer = async (layerNumber: number) => {
    if (wallSelection.layers.length <= 1) {
      toast.error("Cannot delete the last layer");
      return;
    }

    try {
      // Persist deletion to DB if it's already saved
      await deleteLayerMutation.mutateAsync({ 
        roomId: room.id, 
        layerNumber 
      });

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
    } catch {
      toast.error("Failed to delete layer from database");
    }
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

  const handleToggleOrientation = () => {
    const current = wallSelection.orientation || 'horizontal';
    const next = current === 'horizontal' ? 'vertical' : 'horizontal';

    // Recalculate layers with new orientation if a base tile is selected
    if (wallSelection.baseTileId) {
      // Pass the new orientation directly so it doesn't depend on stale state
      calculateWallLayers(wallSelection.baseTileId, next);
    } else {
      // No base tile yet — just update the orientation flag
      onUpdateSelection({ ...wallSelection, orientation: next });
    }

    toast.success(`Tiles rotated to ${next} laying`);
  };

  /* ============================================================
     Industrial Craft — Wall Preview Canvas Renderer
     ============================================================ */

  // Variant-aware color palette for tiles without images
  const VARIANT_COLORS: Record<string, { fill: string; fillEnd: string; text: string; accent: string }> = {
    'L':    { fill: '#F8F4EE', fillEnd: '#EDE8DF', text: '#8C8278', accent: '#D4CCC0' },   // Warm ivory
    'D':    { fill: '#4A4541', fillEnd: '#3A3633', text: '#C8C0B4', accent: '#5C5650' },   // Rich charcoal
    'HL':   { fill: '#E8D5C0', fillEnd: '#D9C4AD', text: '#7A6650', accent: '#C9A882' },   // Warm sand
    'HL1':  { fill: '#D4C4AA', fillEnd: '#C7B599', text: '#6B5A3E', accent: '#B89E78' },   // Golden tan
    'HL2':  { fill: '#C8BFA8', fillEnd: '#B8AD94', text: '#635840', accent: '#A89670' },   // Deeper tan
    'HL3':  { fill: '#BEB4A0', fillEnd: '#AEA490', text: '#5C5038', accent: '#9E8E6A' },   // Earthy brown
    'HLA':  { fill: '#D8CCBA', fillEnd: '#CABCA8', text: '#6E6048', accent: '#BAA888' },   // Warm beige
    'HLB':  { fill: '#CCBFA8', fillEnd: '#BEB098', text: '#635840', accent: '#A89878' },   // Sandy clay
    'HLC':  { fill: '#C4B8A0', fillEnd: '#B6A890', text: '#5A5038', accent: '#9E9068' },   // Olive stone
    'HLD':  { fill: '#B8AE9A', fillEnd: '#AAA08A', text: '#504830', accent: '#948660' },   // Dark clay
    '_DEFAULT': { fill: '#E2DCD4', fillEnd: '#D6CFC4', text: '#6E6860', accent: '#C0B8AA' }, // Neutral
  };

  function getVariantColorKey(tileCode: string): string {
    const base = extractTileBase(tileCode);
    if (!base) return '_DEFAULT';
    const suffix = tileCode.substring(base.length).trim().toUpperCase();
    if (suffix === 'LIGHT') return 'L';
    if (suffix === 'DARK') return 'D';
    // Try exact match first (HL1, HL2, HLA, HLB, etc.)
    if (VARIANT_COLORS[suffix]) return suffix;
    // Try prefix match (HL2A → HL2, HLAP1 → HLA)
    if (suffix.startsWith('HL')) {
      for (const key of ['HL3', 'HL2', 'HL1', 'HLD', 'HLC', 'HLB', 'HLA', 'HL']) {
        if (suffix.startsWith(key)) return key;
      }
      return 'HL';
    }
    return '_DEFAULT';
  }

  function getShortVariantLabel(tileCode: string): string {
    const base = extractTileBase(tileCode);
    if (!base) return '';
    const suffix = tileCode.substring(base.length).trim().toUpperCase();
    if (suffix === 'LIGHT') return 'L';
    if (suffix === 'DARK') return 'D';
    return suffix || '';
  }

  const WALL_PREVIEW = {
    grout: { color: '#A89E90', width: 2 },
    backdrop: '#F0ECE6',
    font: { family: 'Manrope, system-ui, sans-serif', weight: '700', sizeRatio: 0.18 },
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

    // Use orientation to decide which physical dimension is horizontal vs vertical on the wall
    const orientation = wallSelection.orientation || 'horizontal';
    // Horizontal laying: size_length runs horizontally (wider tiles), size_breadth is vertical height
    // Vertical laying:   size_breadth runs horizontally, size_length is vertical height (taller tiles)
    const wallTileW = orientation === 'horizontal'
      ? (firstTile.size_length || 600)
      : (firstTile.size_breadth || 600);
    const wallTileH = orientation === 'horizontal'
      ? (firstTile.size_breadth || 600)
      : (firstTile.size_length || 600);

    // wallTileW = horizontal span, wallTileH = vertical span
    // Preview tile should be landscape for horizontal laying (W > H)
    const whRatio = wallTileW / wallTileH; // e.g. 450/300 = 1.5 for horizontal

    const tilesPerLayer = 6;
    const baseSize = 200;
    let tileWidth: number, tileHeight: number;

    if (whRatio >= 1) {
      // Wider than tall (landscape) — cap width at baseSize
      tileWidth = baseSize;
      tileHeight = baseSize / whRatio;
    } else {
      // Taller than wide (portrait) — cap height at baseSize
      tileHeight = baseSize;
      tileWidth = baseSize * whRatio;
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

    // Enhanced depth/bevel helper
    const addTileDepth = (x: number, y: number, w: number, h: number, isDark: boolean) => {
      // Top edge highlight
      const topGrad = ctx.createLinearGradient(x, y, x, y + h * 0.15);
      topGrad.addColorStop(0, isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)');
      topGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(x, y, w, h * 0.15);

      // Left edge highlight
      const leftGrad = ctx.createLinearGradient(x, y, x + w * 0.08, y);
      leftGrad.addColorStop(0, isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.12)');
      leftGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(x, y, w * 0.08, h);

      // Bottom edge shadow
      const btmGrad = ctx.createLinearGradient(x, y + h * 0.82, x, y + h);
      btmGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      btmGrad.addColorStop(1, isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.08)');
      ctx.fillStyle = btmGrad;
      ctx.fillRect(x, y + h * 0.82, w, h * 0.18);

      // Right edge shadow
      const rightGrad = ctx.createLinearGradient(x + w * 0.92, y, x + w, y);
      rightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rightGrad.addColorStop(1, isDark ? 'rgba(0, 0, 0, 0.10)' : 'rgba(0, 0, 0, 0.04)');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(x + w * 0.92, y, w * 0.08, h);

      // Inner edge (1px inset glow)
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
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
                  addTileDepth(x, y, scaledTileW, scaledTileH, false);
                  bitmap.close();
                  checkComplete();
                }).catch(() => {
                  ctx.drawImage(img, x, y, scaledTileW, scaledTileH);
                  addTileDepth(x, y, scaledTileW, scaledTileH, false);
                  checkComplete();
                });
              } else {
                ctx.drawImage(img, x, y, scaledTileW, scaledTileH);
                addTileDepth(x, y, scaledTileW, scaledTileH, false);
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

    const drawWallFallback = (x: number, y: number, tileData: Tile, _layerIdx: number) => {
      const colorKey = getVariantColorKey(tileData.code);
      const colors = VARIANT_COLORS[colorKey] || VARIANT_COLORS['_DEFAULT'];
      const isDark = colorKey === 'D';

      // Gradient fill (top-to-bottom for a subtle ceramic look)
      const tileGrad = ctx.createLinearGradient(x, y, x, y + scaledTileH);
      tileGrad.addColorStop(0, colors.fill);
      tileGrad.addColorStop(0.6, colors.fill);
      tileGrad.addColorStop(1, colors.fillEnd);
      ctx.fillStyle = tileGrad;
      ctx.fillRect(x, y, scaledTileW, scaledTileH);

      // Subtle diagonal grain (ceramic texture simulation)
      ctx.save();
      ctx.globalAlpha = isDark ? 0.06 : 0.08;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 0.6;
      const grainStep = Math.max(6, scaledTileH / 8);
      for (let i = -scaledTileW; i < scaledTileH + scaledTileW; i += grainStep) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + scaledTileW, y + i - scaledTileW * 0.3);
        ctx.stroke();
      }
      ctx.restore();

      // Variant label — clean, centered, readable
      const label = getShortVariantLabel(tileData.code);
      if (label) {
        const fontSize = Math.min(scaledTileW, scaledTileH) * WALL_PREVIEW.font.sizeRatio;
        ctx.font = `${WALL_PREVIEW.font.weight} ${fontSize}px ${WALL_PREVIEW.font.family}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tm = ctx.measureText(label);
        const pillW = tm.width + fontSize * 1.2;
        const pillH = fontSize * 1.8;
        const pillX = x + scaledTileW / 2 - pillW / 2;
        const pillY = y + scaledTileH / 2 - pillH / 2;
        const pillR = pillH * 0.3;

        // Pill background with opacity
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.moveTo(pillX + pillR, pillY);
        ctx.lineTo(pillX + pillW - pillR, pillY);
        ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + pillR);
        ctx.lineTo(pillX + pillW, pillY + pillH - pillR);
        ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - pillR, pillY + pillH);
        ctx.lineTo(pillX + pillR, pillY + pillH);
        ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - pillR);
        ctx.lineTo(pillX, pillY + pillR);
        ctx.quadraticCurveTo(pillX, pillY, pillX + pillR, pillY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = colors.text;
        ctx.fillText(label, x + scaledTileW / 2, y + scaledTileH / 2);
      }

      addTileDepth(x, y, scaledTileW, scaledTileH, isDark);
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
      {/* Compact Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack} size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <Separator orientation="vertical" className="h-8 mx-1 hidden sm:block" />
          
          <div>
            <h2 className="text-xl font-bold tracking-tight leading-none mb-1">Configure Wall Tiles</h2>
            <p className="text-xs text-muted-foreground font-medium">
              {room.name} &bull; {wallSelection.layers.length} Layer{wallSelection.layers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-muted/40 px-6 py-2 rounded-lg border text-sm">
          <div className="flex flex-col items-center">
             <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Measurements</span>
             <div className="flex flex-col items-center">
               {room.wall_measurements && Array.isArray(room.wall_measurements) && room.wall_measurements.length > 0 ? (
                 room.wall_measurements.slice(0, 2).map((m: { length: string; width: string }, idx: number) => (
                   <span key={idx} className="font-bold text-foreground leading-tight whitespace-nowrap">
                     {m.length} × {m.width} {room.unit}
                   </span>
                 ))
               ) : (
                 <span className="font-bold text-foreground whitespace-nowrap">
                   {room.wall_length || 0} × {room.wall_height || 0} {room.unit}
                 </span>
               )}
               {room.wall_measurements && Array.isArray(room.wall_measurements) && room.wall_measurements.length > 2 && (
                 <span className="text-[10px] text-muted-foreground">+{room.wall_measurements.length - 2} more</span>
               )}
             </div>
          </div>
          
          <Separator orientation="vertical" className="h-10 opacity-30" />
          
          <div className="flex flex-col items-center justify-center">
             <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Total Wall Area</span>
             <span className="font-bold text-foreground text-base leading-none whitespace-nowrap">
               {totalArea.toFixed(2)} <span className="text-[10px] uppercase font-medium">sq {room.unit}</span>
             </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Layer Configuration Card */}
        <Card className="shadow-md border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Layer Configuration
              </div>
              <div className="flex items-center gap-2">
                {wallSelection.baseTileId && (
                  <>
                    <Button onClick={handleAddLayer} size="sm" className="gap-1.5 h-8">
                      <Plus className="h-3.5 w-3.5" />
                      Add Layer
                    </Button>
                    <Button
                      onClick={handleToggleOrientation}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground shadow-sm"
                      title={`Currently: ${(wallSelection.orientation || 'horizontal')} laying. Click to switch.`}
                    >
                      {(wallSelection.orientation || 'horizontal') === 'horizontal' ? (
                        <RectangleHorizontal className="h-3.5 w-3.5" />
                      ) : (
                        <RectangleVertical className="h-3.5 w-3.5" />
                      )}
                      {(wallSelection.orientation || 'horizontal') === 'horizontal' ? 'Horizontal' : 'Vertical'}
                    </Button>
                    {wallSelection.layers.length > 0 && (
                      <Button
                        onClick={handlePreview}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 border-primary/20 hover:bg-primary/5 text-primary shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    )}
                  </>
                )}
                {wallSelection.layers.length > 0 && originalLayers.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetLayers}
                    className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!wallSelection.baseTileId ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                <div className="bg-primary/5 p-6 rounded-full">
                  <Box className="h-12 w-12 text-primary/40" />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-lg font-semibold mb-2">No Base Tile Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a base tile to automatically calculate and generate wall layers.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <Button
                    onClick={handleSelectBaseTile}
                    className="flex-1 gap-2"
                    size="lg"
                  >
                    <Plus className="h-4 w-4" />
                    Select Base Tile
                  </Button>
                  <Button
                    onClick={handleScanQRForBaseTile}
                    variant="outline"
                    className="flex-1 gap-2"
                    size="lg"
                  >
                    <QrCode className="h-4 w-4" />
                    Scan QR Code
                  </Button>
                </div>
              </div>
            ) : wallSelection.layers.length > 0 ? (
              <div className="space-y-6">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted">
                  {wallSelection.layers
                    .sort((a, b) => a.layerNumber - b.layerNumber)
                    .map(layer => {
                      const tile = tiles.find(t => t.id === layer.tileId);
                      return tile ? (
                        <div key={layer.layerNumber} className="bg-card rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all group">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0">
                                  Layer {layer.layerNumber}
                                </Badge>
                              </div>
                              <p className="font-bold text-foreground truncate">{tile.code}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {layer.tilesNeeded.toFixed(2)} tiles estimated
                              </p>
                            </div>

                            <div className="flex gap-1 ml-4 opacity-70 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleChangeLayerTile(layer.layerNumber)}
                                className="h-9 w-9 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                                title="Change tile"
                              >
                                <Layers className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleScanQRForLayer(layer.layerNumber)}
                                className="h-9 w-9 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                                title="Scan QR for this layer"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyTileToAllLayers(layer.tileId)}
                                className="h-9 w-9 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                                title="Copy to all layers"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {wallSelection.layers.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteLayer(layer.layerNumber)}
                                  className="h-9 w-9 p-0 rounded-lg hover:bg-red-50 hover:text-red-600"
                                  title="Delete layer"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Variant Quick-Select Chips */}
                          {(() => {
                            const variants = variantMap.get(layer.tileId) || [];
                            if (variants.length === 0) return null;
                            return (
                              <div className="px-4 pb-3 pt-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">Variants</span>
                                  {variants.map(v => (
                                    <button
                                      key={v.tile.id}
                                      type="button"
                                      onClick={() => {
                                        const updatedLayers = wallSelection.layers.map(l =>
                                          l.layerNumber === layer.layerNumber
                                            ? { ...l, tileId: v.tile.id }
                                            : l
                                        );
                                        onUpdateSelection({ ...wallSelection, layers: updatedLayers });
                                        toast.success(`Layer ${layer.layerNumber} → ${v.label}`);
                                      }}
                                      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border transition-all cursor-pointer
                                        bg-muted/50 border-border/60 text-muted-foreground
                                        hover:bg-primary/10 hover:border-primary/30 hover:text-primary
                                        active:scale-95"
                                      title={v.tile.code}
                                    >
                                      {v.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : null;
                    })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No layers configured yet.</p>
                <p className="text-sm">Add a layer or select a base tile to get started.</p>
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

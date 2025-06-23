
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, IndianRupee } from "lucide-react";

interface QuotationItem {
  id: string;
  room_id: string;
  tile_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Room {
  id: string;
  name: string;
  length: number;
  width: number;
  unit: string;
}

interface Tile {
  id: string;
  name: string;
  price_per_sqm: number;
}

interface QuotationItemCardProps {
  item: QuotationItem;
  index: number;
  rooms: Room[];
  tiles: Tile[];
  onUpdate: (id: string, field: keyof QuotationItem, value: any) => void;
  onRemove: (id: string) => void;
}

export const QuotationItemCard = ({ 
  item, 
  index, 
  rooms, 
  tiles, 
  onUpdate, 
  onRemove 
}: QuotationItemCardProps) => {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline">Item #{index + 1}</Badge>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Room</Label>
          <Select
            value={item.room_id}
            onValueChange={(value) => onUpdate(item.id, 'room_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name} ({room.length}×{room.width} {room.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tile</Label>
          <Select
            value={item.tile_id}
            onValueChange={(value) => onUpdate(item.id, 'tile_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tile" />
            </SelectTrigger>
            <SelectContent>
              {tiles.map((tile) => (
                <SelectItem key={tile.id} value={tile.id}>
                  {tile.name} - ₹{tile.price_per_sqm}/sqm
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Quantity (sqm)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.quantity}
            onChange={(e) => onUpdate(item.id, 'quantity', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>

        <div>
          <Label>Total Price</Label>
          <div className="flex items-center gap-1 font-semibold text-green-600">
            <IndianRupee className="h-4 w-4" />
            {item.total_price.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};


import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, IndianRupee } from "lucide-react";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface QuotationItem {
  id?: string;
  room_id: string;
  tile_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface QuotationItemsSectionProps {
  items: QuotationItem[];
  rooms: Room[];
  tiles: Tile[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof QuotationItem, value: any) => void;
}

export const QuotationItemsSection = ({
  items,
  rooms,
  tiles,
  onAddItem,
  onRemoveItem,
  onUpdateItem
}: QuotationItemsSectionProps) => {
  const getTotalCost = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quotation Items</CardTitle>
          <Button onClick={onAddItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={item.room_id} onValueChange={(value) => onUpdateItem(index, 'room_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tile</Label>
                <Select value={item.tile_id} onValueChange={(value) => onUpdateItem(index, 'tile_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tile" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiles.map((tile) => (
                      <SelectItem key={tile.id} value={tile.id}>
                        {tile.name} - {tile.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity (sqm)</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label>Unit Price (₹)</Label>
                <Input
                  type="number"
                  value={item.unit_price}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Total (₹)</Label>
                <Input
                  type="number"
                  value={item.total_price}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="flex items-end">
                <Button variant="destructive" size="sm" onClick={() => onRemoveItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No items added yet. Click "Add Item" to get started.</p>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-lg font-semibold flex items-center gap-1">
                  <IndianRupee className="h-5 w-5" />
                  Total: {getTotalCost().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

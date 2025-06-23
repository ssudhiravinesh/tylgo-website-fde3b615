
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Plus } from "lucide-react";
import { QuotationItemCard } from "./QuotationItemCard";

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

interface QuotationItemsSectionProps {
  items: QuotationItem[];
  rooms: Room[];
  tiles: Tile[];
  onAddItem: () => void;
  onUpdateItem: (id: string, field: keyof QuotationItem, value: any) => void;
  onRemoveItem: (id: string) => void;
}

export const QuotationItemsSection = ({
  items,
  rooms,
  tiles,
  onAddItem,
  onUpdateItem,
  onRemoveItem
}: QuotationItemsSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Quotation Items
          </CardTitle>
          <Button type="button" onClick={onAddItem} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No items added yet. Click "Add Item" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <QuotationItemCard
                key={item.id}
                item={item}
                index={index}
                rooms={rooms}
                tiles={tiles}
                onUpdate={onUpdateItem}
                onRemove={onRemoveItem}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

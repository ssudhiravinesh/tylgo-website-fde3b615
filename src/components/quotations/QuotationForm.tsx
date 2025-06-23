
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useCreateQuotation } from "@/hooks/useQuotations";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer, useRoomTileSelections } from "@/hooks/useRooms";
import { useTiles } from "@/hooks/useTiles";
import { useCreateQuotationItem } from "@/hooks/useQuotationItems";
import { QuotationCustomerSection } from "./QuotationCustomerSection";
import { QuotationItemsSection } from "./QuotationItemsSection";
import { QuotationNotesSection } from "./QuotationNotesSection";
import { QuotationSummary } from "./QuotationSummary";

const quotationSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer"),
  status: z.enum(["draft", "sent", "approved", "rejected"]).default("draft"),
  notes: z.string().optional(),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

interface QuotationItem {
  id: string;
  room_id: string;
  tile_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface QuotationFormProps {
  customerId?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const QuotationForm = ({ customerId, onBack, onSuccess }: QuotationFormProps) => {
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: customers = [] } = useCustomers();
  const { data: rooms = [] } = useRoomsByCustomer(customerId || "");
  const { data: tiles = [] } = useTiles();
  const { data: tileSelections = [] } = useRoomTileSelections(customerId || "");
  
  const createQuotationMutation = useCreateQuotation();
  const createQuotationItemMutation = useCreateQuotationItem();

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customer_id: customerId || "",
      status: "draft",
      notes: "",
    },
  });

  // Auto-populate items from room-tile selections when component mounts
  useEffect(() => {
    if (customerId && tileSelections.length > 0 && rooms.length > 0 && tiles.length > 0) {
      const autoItems: QuotationItem[] = [];

      tileSelections.forEach(selection => {
        const room = rooms.find(r => r.id === selection.room_id);
        const tile = tiles.find(t => t.id === selection.tile_id);

        if (room && tile) {
          const roomArea = room.length * room.width;
          const totalPrice = roomArea * tile.price_per_sqm;

          autoItems.push({
            id: `auto-${selection.id}`,
            room_id: selection.room_id,
            tile_id: selection.tile_id,
            quantity: roomArea,
            unit_price: tile.price_per_sqm,
            total_price: totalPrice,
          });
        }
      });

      if (autoItems.length > 0) {
        setItems(autoItems);
        toast.success(`Auto-populated ${autoItems.length} items from room selections`);
      }
    }
  }, [customerId, tileSelections, rooms, tiles]);

  const addItem = () => {
    const newItem: QuotationItem = {
      id: `new-${Date.now()}`,
      room_id: "",
      tile_id: "",
      quantity: 0,
      unit_price: 0,
      total_price: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
        }
        
        if (field === 'tile_id') {
          const selectedTile = tiles.find(t => t.id === value);
          if (selectedTile) {
            updatedItem.unit_price = selectedTile.price_per_sqm;
            updatedItem.total_price = updatedItem.quantity * selectedTile.price_per_sqm;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalCost = items.reduce((sum, item) => sum + item.total_price, 0);

  const onSubmit = async (data: QuotationFormData) => {
    if (items.length === 0) {
      toast.error("Please add at least one item to the quotation");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the quotation
      const quotationData = {
        customer_id: data.customer_id,
        status: data.status,
        total_cost: totalCost,
        notes: data.notes,
      };

      const createdQuotation = await createQuotationMutation.mutateAsync(quotationData);

      // Create quotation items
      for (const item of items) {
        if (item.room_id && item.tile_id && item.quantity > 0) {
          await createQuotationItemMutation.mutateAsync({
            quotation_id: createdQuotation.id,
            room_id: item.room_id,
            tile_id: item.tile_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          });
        }
      }

      toast.success("Quotation created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error creating quotation:", error);
      toast.error("Failed to create quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2" disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create New Quotation</h1>
          <p className="text-gray-600">Fill in the details to create a new quotation</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <QuotationCustomerSection
            control={form.control}
            customers={customers}
            selectedCustomerId={customerId}
          />

          <QuotationItemsSection
            items={items}
            rooms={rooms}
            tiles={tiles}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
          />

          <QuotationNotesSection control={form.control} />

          <QuotationSummary totalCost={totalCost} itemCount={items.length} />

          <Card>
            <CardHeader>
              <CardTitle>Submit Quotation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Create Quotation"}
                </Button>
                <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};

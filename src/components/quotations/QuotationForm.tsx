
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FileText } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import { useCreateQuotation } from "@/hooks/useQuotations";
import { toast } from "sonner";
import { QuotationCustomerSection } from "./QuotationCustomerSection";
import { QuotationItemsSection } from "./QuotationItemsSection";
import { QuotationNotesSection } from "./QuotationNotesSection";
import { QuotationSummary } from "./QuotationSummary";

const quotationSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer"),
  status: z.enum(["draft", "sent", "approved", "rejected"]),
  notes: z.string().optional(),
});

interface QuotationItem {
  id: string;
  room_id: string;
  tile_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface QuotationFormProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export const QuotationForm = ({ onBack, onSuccess }: QuotationFormProps) => {
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  
  const { data: tiles = [] } = useTiles();
  const { data: rooms = [] } = useRoomsByCustomer(selectedCustomerId);
  const createQuotationMutation = useCreateQuotation();

  const form = useForm<z.infer<typeof quotationSchema>>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      status: "draft",
      notes: "",
    },
  });

  const customerRooms = rooms.filter(room => room.customer_id === selectedCustomerId);

  const addQuotationItem = () => {
    const newItem: QuotationItem = {
      id: Math.random().toString(36).substr(2, 9),
      room_id: "",
      tile_id: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    };
    setQuotationItems([...quotationItems, newItem]);
  };

  const removeQuotationItem = (id: string) => {
    setQuotationItems(quotationItems.filter(item => item.id !== id));
  };

  const updateQuotationItem = (id: string, field: keyof QuotationItem, value: any) => {
    setQuotationItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total price when quantity or unit_price changes
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
          }
          
          // Auto-set unit price when tile is selected
          if (field === 'tile_id') {
            const selectedTile = tiles.find(tile => tile.id === value);
            if (selectedTile) {
              updatedItem.unit_price = selectedTile.price_per_sqm;
              updatedItem.total_price = updatedItem.quantity * selectedTile.price_per_sqm;
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const getTotalCost = () => {
    return quotationItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const onSubmit = async (values: z.infer<typeof quotationSchema>) => {
    if (quotationItems.length === 0) {
      toast.error("Please add at least one item to the quotation");
      return;
    }

    const invalidItems = quotationItems.filter(item => !item.room_id || !item.tile_id || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast.error("Please complete all quotation items");
      return;
    }

    try {
      await createQuotationMutation.mutateAsync({
        customer_id: values.customer_id,
        status: values.status,
        total_cost: getTotalCost(),
        notes: values.notes,
      });
      
      toast.success("Quotation created successfully!");
      onSuccess?.();
      onBack();
    } catch (error) {
      console.error("Error creating quotation:", error);
      toast.error("Failed to create quotation");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Create New Quotation
          </h1>
          <p className="text-gray-600">Generate detailed quotations for your customers</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Quotations
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <QuotationCustomerSection 
            control={form.control}
            onCustomerChange={setSelectedCustomerId}
          />

          <QuotationItemsSection
            items={quotationItems}
            rooms={customerRooms}
            tiles={tiles}
            onAddItem={addQuotationItem}
            onUpdateItem={updateQuotationItem}
            onRemoveItem={removeQuotationItem}
          />

          <QuotationNotesSection control={form.control} />

          <QuotationSummary 
            totalCost={getTotalCost()}
            itemCount={quotationItems.length}
          />

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={createQuotationMutation.isPending}
            >
              {createQuotationMutation.isPending ? "Creating..." : "Create Quotation"}
            </Button>
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

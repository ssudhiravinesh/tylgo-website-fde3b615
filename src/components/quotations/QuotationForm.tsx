import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, IndianRupee } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useTiles } from "@/hooks/useTiles";
import { useRooms } from "@/hooks/useRooms";
import { useCreateQuotation, useUpdateQuotation, useQuotationForEdit } from "@/hooks/useQuotations";
import { toast } from "sonner";

interface QuotationFormProps {
  onBack: () => void;
  quotationId?: string;
  isEditing?: boolean;
}

interface QuotationItem {
  tile_id: string;
  room_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface QuotationFormData {
  customer_id: string;
  notes?: string;
  items: QuotationItem[];
}

export const QuotationForm = ({ onBack, quotationId, isEditing = false }: QuotationFormProps) => {
  const [items, setItems] = useState<QuotationItem[]>([]);
  const { data: customers = [] } = useCustomers();
  const { data: tiles = [] } = useTiles();
  const { data: rooms = [] } = useRooms();
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  
  // Fetch quotation data for editing
  const { data: quotationData, isLoading: isLoadingQuotation } = useQuotationForEdit(
    isEditing && quotationId ? quotationId : ''
  );

  const form = useForm<QuotationFormData>({
    defaultValues: {
      customer_id: "",
      notes: "",
      items: [],
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditing && quotationData) {
      form.setValue('customer_id', quotationData.customer_id);
      form.setValue('notes', quotationData.notes || '');
      
      // Convert quotation items to form items
      const formItems = quotationData.quotation_items.map(item => ({
        tile_id: item.tile_id,
        room_id: item.room_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
      
      setItems(formItems);
    }
  }, [quotationData, isEditing, form]);

  const addItem = () => {
    setItems([...items, {
      tile_id: "",
      room_id: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate total price when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }

    // Update unit price when tile is selected
    if (field === 'tile_id') {
      const selectedTile = tiles.find(tile => tile.id === value);
      if (selectedTile) {
        updatedItems[index].unit_price = selectedTile.price_per_sqm;
        updatedItems[index].total_price = updatedItems[index].quantity * selectedTile.price_per_sqm;
      }
    }

    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const onSubmit = async (data: QuotationFormData) => {
    if (items.length === 0) {
      toast.error("Please add at least one item to the quotation");
      return;
    }

    const quotationData = {
      customer_id: data.customer_id,
      notes: data.notes,
      status: 'draft' as const,
      total_cost: calculateTotal(),
      items: items,
    };

    try {
      if (isEditing && quotationId) {
        await updateQuotation.mutateAsync({ quotationId, quotationData });
      } else {
        await createQuotation.mutateAsync(quotationData);
      }
      onBack();
    } catch (error) {
      console.error('Error saving quotation:', error);
    }
  };

  if (isEditing && isLoadingQuotation) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Quotations
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Edit Quotation' : 'Create New Quotation'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Modify quotation details and items' : 'Add items and calculate pricing for customer'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} - {customer.mobile}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes or requirements..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quotation Items</CardTitle>
              <Button type="button" onClick={addItem} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No items added yet. Click "Add Item" to get started.</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium">Tile</label>
                          <Select
                            value={item.tile_id}
                            onValueChange={(value) => updateItem(index, 'tile_id', value)}
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
                          <label className="text-sm font-medium">Room</label>
                          <Select
                            value={item.room_id}
                            onValueChange={(value) => updateItem(index, 'room_id', value)}
                          >
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

                        <div>
                          <label className="text-sm font-medium">Quantity (sqm)</label>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="text-sm font-medium">Total</label>
                            <div className="flex items-center gap-1 p-2 bg-gray-50 rounded border">
                              <IndianRupee className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{item.total_price.toFixed(2)}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {items.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="h-5 w-5" />
                      <span>{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={createQuotation.isPending || updateQuotation.isPending || items.length === 0}>
              {createQuotation.isPending || updateQuotation.isPending 
                ? (isEditing ? "Updating..." : "Creating...") 
                : (isEditing ? "Update Quotation" : "Create Quotation")
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

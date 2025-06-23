import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Calculator, FileText, User, IndianRupee } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useTiles } from "@/hooks/useTiles";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import { useUpdateQuotation, Quotation } from "@/hooks/useQuotations";
import { useQuotationItems, useCreateQuotationItem, useUpdateQuotationItem, useDeleteQuotationItem } from "@/hooks/useQuotationItems";
import { toast } from "sonner";

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

interface QuotationEditFormProps {
  quotation: Quotation;
  onBack: () => void;
  onSuccess?: () => void;
}

export const QuotationEditForm = ({ quotation, onBack, onSuccess }: QuotationEditFormProps) => {
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(quotation.customer_id);
  
  const { data: customers = [] } = useCustomers();
  const { data: tiles = [] } = useTiles();
  const { data: rooms = [] } = useRoomsByCustomer(selectedCustomerId);
  const { data: existingItems = [] } = useQuotationItems(quotation.id);
  
  const updateQuotationMutation = useUpdateQuotation();
  const createQuotationItemMutation = useCreateQuotationItem();
  const updateQuotationItemMutation = useUpdateQuotationItem();
  const deleteQuotationItemMutation = useDeleteQuotationItem();

  const form = useForm<z.infer<typeof quotationSchema>>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customer_id: quotation.customer_id,
      status: quotation.status,
      notes: quotation.notes || "",
    },
  });

  // Load existing items when component mounts
  useEffect(() => {
    if (existingItems.length > 0) {
      const formattedItems = existingItems.map(item => ({
        id: item.id,
        room_id: item.room_id,
        tile_id: item.tile_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
      }));
      setQuotationItems(formattedItems);
    }
  }, [existingItems]);

  const customerRooms = rooms.filter(room => room.customer_id === selectedCustomerId);

  const addQuotationItem = () => {
    const newItem: QuotationItem = {
      id: `new-${Math.random().toString(36).substr(2, 9)}`,
      room_id: "",
      tile_id: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    };
    setQuotationItems([...quotationItems, newItem]);
  };

  const removeQuotationItem = async (id: string) => {
    if (id.startsWith('new-')) {
      // Remove local item
      setQuotationItems(quotationItems.filter(item => item.id !== id));
    } else {
      // Delete from database
      try {
        await deleteQuotationItemMutation.mutateAsync({ id, quotationId: quotation.id });
        setQuotationItems(quotationItems.filter(item => item.id !== id));
      } catch (error) {
        console.error("Error deleting item:", error);
        toast.error("Failed to delete item");
      }
    }
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
      // Update quotation
      await updateQuotationMutation.mutateAsync({
        id: quotation.id,
        customer_id: values.customer_id,
        status: values.status,
        total_cost: getTotalCost(),
        notes: values.notes,
      });

      // Handle quotation items (create new, update existing)
      for (const item of quotationItems) {
        if (item.id.startsWith('new-')) {
          // Create new item
          await createQuotationItemMutation.mutateAsync({
            quotation_id: quotation.id,
            room_id: item.room_id,
            tile_id: item.tile_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          });
        } else {
          // Update existing item
          await updateQuotationItemMutation.mutateAsync({
            id: item.id,
            room_id: item.room_id,
            tile_id: item.tile_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          });
        }
      }
      
      toast.success("Quotation updated successfully!");
      onSuccess?.();
      onBack();
    } catch (error) {
      console.error("Error updating quotation:", error);
      toast.error("Failed to update quotation");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Edit Quotation - {quotation.quotation_number}
          </h1>
          <p className="text-gray-600">Update quotation details and items</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Details
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Customer</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedCustomerId(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a customer" />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Quotation Items
                </CardTitle>
                <Button type="button" onClick={addQuotationItem} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quotationItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No items added yet. Click "Add Item" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotationItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="outline">Item #{index + 1}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuotationItem(item.id)}
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
                            onValueChange={(value) => updateQuotationItem(item.id, 'room_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                            <SelectContent>
                              {customerRooms.map((room) => (
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
                            onValueChange={(value) => updateQuotationItem(item.id, 'tile_id', value)}
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
                            onChange={(e) => updateQuotationItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes or terms for this quotation..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Total Quotation Amount</h3>
                  <p className="text-sm text-blue-700">Including all items and calculations</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-2xl font-bold text-blue-900">
                    <IndianRupee className="h-6 w-6" />
                    {getTotalCost().toLocaleString()}
                  </div>
                  <p className="text-sm text-blue-700">{quotationItems.length} item(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={updateQuotationMutation.isPending}
            >
              {updateQuotationMutation.isPending ? "Updating..." : "Update Quotation"}
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

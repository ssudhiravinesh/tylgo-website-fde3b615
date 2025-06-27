
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import { useTiles } from "@/hooks/useTiles";
import { useCreateQuotation, useUpdateQuotation, type Quotation } from "@/hooks/useQuotations";
import { useCreateQuotationItem, useQuotationItems, useDeleteQuotationItem, useUpdateQuotationItem, type QuotationItem } from "@/hooks/useQuotationItems";
import { QuotationItemsSection } from "./QuotationItemsSection";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface QuotationFormProps {
  onBack: () => void;
  onSuccess: () => void;
  preSelectedCustomerId?: string;
  selectedRoomsData?: Array<{
    roomId: string;
    tileId: string;
    quantity: number;
  }>;
  editMode?: boolean;
  existingQuotation?: Quotation;
}

type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export const QuotationForm = ({ 
  onBack, 
  onSuccess, 
  preSelectedCustomerId, 
  selectedRoomsData,
  editMode = false,
  existingQuotation
}: QuotationFormProps) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(preSelectedCustomerId || existingQuotation?.customer_id || "");
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [notes, setNotes] = useState(existingQuotation?.notes || "");
  const [status, setStatus] = useState<QuotationStatus>((existingQuotation?.status as QuotationStatus) || 'draft');

  const { customers = [] } = useCustomers();
  const { data: rooms = [] } = useRoomsByCustomer(selectedCustomerId);
  const { data: tiles = [] } = useTiles();
  const { mutate: createQuotation, isPending: isCreating } = useCreateQuotation();
  const { mutate: updateQuotation, isPending: isUpdating } = useUpdateQuotation();
  const { mutate: createQuotationItem } = useCreateQuotationItem();
  const { data: existingItems = [] } = useQuotationItems(existingQuotation?.id || "");
  const { mutate: deleteQuotationItem } = useDeleteQuotationItem();
  const { mutate: updateQuotationItem } = useUpdateQuotationItem();
  const { profile } = useAuth();

  // Generate quotation number
  const generateQuotationNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QT-${year}${month}${day}-${random}`;
  };

  useEffect(() => {
    if (editMode && existingItems.length > 0) {
      console.log('Loading existing items:', existingItems);
      const formattedItems = existingItems.map(item => ({
        id: item.id,
        quotation_id: item.quotation_id,
        room_id: item.room_id,
        tile_id: item.tile_id,
        area: item.area,
        price_per_box: item.price_per_box,
        total_price: item.total_price,
        created_at: item.created_at,
        room: item.room,
        tile: item.tile,
      }));
      setItems(formattedItems);
    }
  }, [editMode, existingItems]);

  useEffect(() => {
    if (!editMode && selectedRoomsData && selectedRoomsData.length > 0) {
      const autoItems: QuotationItem[] = selectedRoomsData.map(roomData => {
        const tile = tiles.find(t => t.id === roomData.tileId);
        
        let pricePerBox = 0;
        if (tile?.price_per_box && tile.pieces_per_box && tile.size_length && tile.size_breadth) {
          pricePerBox = tile.price_per_box;
        }
        
        const totalPrice = roomData.quantity * pricePerBox;

        return {
          id: undefined,
          quotation_id: '',
          room_id: roomData.roomId,
          tile_id: roomData.tileId,
          area: roomData.quantity,
          price_per_box: pricePerBox,
          total_price: totalPrice,
          created_at: '',
        };
      });
      setItems(autoItems);
    }
  }, [selectedRoomsData, tiles, editMode]);

  const addItem = () => {
    setItems([...items, {
      id: undefined,
      quotation_id: '',
      room_id: "",
      tile_id: "",
      area: 1,
      price_per_box: 0,
      total_price: 0,
      created_at: '',
    }]);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (editMode && item.id && existingQuotation) {
      try {
        await deleteQuotationItem({ id: item.id, quotationId: existingQuotation.id });
        setItems(items.filter((_, i) => i !== index));
        toast.success('Item removed successfully');
      } catch (error) {
        console.error('Error removing item:', error);
        toast.error('Failed to remove item');
      }
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = async (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    const oldItem = newItems[index];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'area' || field === 'tile_id' || field === 'room_id') {
      const item = newItems[index];
      const tile = tiles.find(t => t.id === item.tile_id);
      const room = rooms.find(r => r.id === item.room_id);
      
      if (tile && room) {
        let pricePerBox = 0;
        if (tile.price_per_box && tile.pieces_per_box && tile.size_length && tile.size_breadth) {
          const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000;
          const areaPerBoxSqFt = (tileAreaSqm * tile.pieces_per_box) * 10.764;
          pricePerBox = tile.price_per_box / areaPerBoxSqFt;
        }
        
        newItems[index].price_per_box = pricePerBox;
        newItems[index].total_price = item.area * pricePerBox;
      }
    }

    setItems(newItems);

    if (editMode && oldItem.id && existingQuotation) {
      try {
        await updateQuotationItem({
          id: oldItem.id,
          ...newItems[index]
        });
      } catch (error) {
        console.error('Error updating item:', error);
        toast.error('Failed to update item');
      }
    }
  };

  const getTotalCost = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }

    if (!profile?.id) {
      toast.error("User profile not found");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const invalidItems = items.some(item => 
      !item.room_id || !item.tile_id || item.area <= 0
    );

    if (invalidItems) {
      toast.error("Please fill in all item details");
      return;
    }

    const quotationData = {
      quotation_number: existingQuotation?.quotation_number || generateQuotationNumber(),
      customer_id: selectedCustomerId,
      worker_id: profile.id,
      status,
      total_cost: getTotalCost(),
      notes: notes.trim() || undefined,
    };

    if (editMode && existingQuotation) {
      updateQuotation({
        id: existingQuotation.id,
        ...quotationData,
      }, {
        onSuccess: async (updatedQuotation) => {
          const newItems = items.filter(item => !item.id);
          for (const item of newItems) {
            try {
              await createQuotationItem({
                quotation_id: updatedQuotation.id,
                room_id: item.room_id,
                tile_id: item.tile_id,
                area: item.area,
                price_per_box: item.price_per_box,
                total_price: item.total_price,
              });
            } catch (error) {
              console.error('Error creating new item:', error);
            }
          }
          onSuccess();
        },
      });
    } else {
      createQuotation(quotationData, {
        onSuccess: async (newQuotation) => {
          for (const item of items) {
            try {
              await createQuotationItem({
                quotation_id: newQuotation.id,
                room_id: item.room_id,
                tile_id: item.tile_id,
                area: item.area,
                price_per_box: item.price_per_box,
                total_price: item.total_price,
              });
            } catch (error) {
              console.error('Error creating item:', error);
            }
          }
          onSuccess();
        },
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {editMode ? 'Edit Quotation' : 'Create New Quotation'}
          </h1>
          <p className="text-gray-600">
            {editMode ? 'Update quotation details' : 'Generate a quotation for your customer'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={editMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.mobile}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: QuotationStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <QuotationItemsSection
        items={items}
        rooms={rooms}
        tiles={tiles}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItem={updateItem}
      />

      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isCreating || isUpdating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isCreating || isUpdating ? "Saving..." : editMode ? "Update Quotation" : "Create Quotation"}
        </Button>
      </div>
    </div>
  );
};

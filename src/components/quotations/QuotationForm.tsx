import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/hooks/useCustomers";
import { useWorkers } from "@/hooks/useWorkers";
import { useCreateQuotation } from "@/hooks/useQuotations";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface QuotationFormProps {
  preSelectedCustomerId?: string;
  selectedRoomsData: Array<{
    roomId: string;
    tileId: string;
    quantity: number;
    wastagePercentage: number;
  }>;
  wastagePercentage?: number;
  onBack?: () => void;
  onSuccess?: () => void;
}

const quotationFormSchema = z.object({
  quotationNumber: z.string().min(3, {
    message: "Quotation number must be at least 3 characters.",
  }),
  customerId: z.string().uuid({
    message: "Please select a valid customer.",
  }),
  status: z.enum(["draft", "approved"]),
  notes: z.string().optional(),
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;

export const QuotationForm = ({ 
  preSelectedCustomerId, 
  selectedRoomsData, 
  wastagePercentage = 10,
  onBack, 
  onSuccess 
}: QuotationFormProps) => {
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: workers, isLoading: workersLoading } = useWorkers();
  const { user } = workers;
  const createQuotation = useCreateQuotation();

  const [grandTotal, setGrandTotal] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: preSelectedCustomerId,
      status: "draft",
    },
  });

  useEffect(() => {
    // Calculate grand total based on selected rooms data
    let total = 0;
    selectedRoomsData.forEach(roomData => {
      const tileId = roomData.tileId;
      const tile = findTileById(tileId);
      if (tile) {
        total += (roomData.quantity * (1 + (roomData.wastagePercentage / 100))) * (tile.price_per_box || 0);
      }
    });
    setGrandTotal(total);
  }, [selectedRoomsData]);

  const findTileById = (tileId: string) => {
    for (const roomData of selectedRoomsData) {
      if (roomData.tileId === tileId) {
        return workers.tiles?.find(tile => tile.id === tileId);
      }
    }
    return undefined;
  };

  const handleSubmit = async (data: QuotationFormData) => {
    try {
      console.log('Submitting quotation form with data:', data);
      
      // Prepare quotation items
      const quotationItems = selectedRoomsData.map(roomData => {
        const tile = findTileById(roomData.tileId);
        return {
          tile_id: roomData.tileId,
          room_id: roomData.roomId,
          area: roomData.quantity,
          price_per_box: tile?.price_per_box || 0,
          total_price: (roomData.quantity * (1 + (roomData.wastagePercentage / 100))) * (tile?.price_per_box || 0),
        };
      });

      const quotationData: CreateQuotationData = {
        quotation_number: data.quotationNumber,
        customer_id: data.customerId,
        worker_id: user?.id || '',
        total_cost: grandTotal,
        status: data.status,
        notes: data.notes || undefined,
        wastage_percentage: wastagePercentage, // Include wastage percentage
        items: quotationItems,
      };

      console.log('Creating quotation with data:', quotationData);

      await createQuotation(quotationData);

      toast.success('Quotation created successfully!');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error('Failed to create quotation. Please try again.');
    }
  };

  if (customersLoading || workersLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-4xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Quotation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="quotationNumber">Quotation Number</Label>
              <Controller
                control={control}
                name="quotationNumber"
                render={({ field }) => (
                  <Input id="quotationNumber" placeholder="Enter quotation number" {...field} />
                )}
              />
              {errors.quotationNumber && (
                <p className="text-red-500 text-sm">{errors.quotationNumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customerId && (
                <p className="text-red-500 text-sm">{errors.customerId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-red-500 text-sm">{errors.status.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <Textarea id="notes" placeholder="Enter any notes" {...field} />
                )}
              />
              {errors.notes && (
                <p className="text-red-500 text-sm">{errors.notes.message}</p>
              )}
            </div>

            <div>
              <Label>Total Cost</Label>
              <div className="font-bold text-2xl">₹{grandTotal.toLocaleString()}</div>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button type="submit">Create Quotation</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

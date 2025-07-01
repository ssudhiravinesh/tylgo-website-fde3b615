
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
import { useAuth } from "@/hooks/useAuth";
import { useCreateQuotation, type CreateQuotationData } from "@/hooks/useQuotations";

interface QuotationFormProps {
  preSelectedCustomerId?: string;
  selectedRoomsData: Array<{
    roomId: string;
    tileId: string;
    quantity: number;
    wastagePercentage: number;
  }>;
  wastagePercentage: number; // Now required, passed from TileSelectionStep
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
  wastagePercentage, // Use the passed wastage percentage
  onBack, 
  onSuccess 
}: QuotationFormProps) => {
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { user } = useAuth();
  const { mutateAsync: createQuotation } = useCreateQuotation();

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
    // Calculate grand total based on selected rooms data using the passed wastage percentage
    let total = 0;
    selectedRoomsData.forEach(roomData => {
      const tilePrice = 100; // Placeholder price - in real app this would come from tile data
      total += (roomData.quantity * (1 + (wastagePercentage / 100))) * tilePrice;
    });
    setGrandTotal(total);
  }, [selectedRoomsData, wastagePercentage]);

  const onSubmit = async (data: QuotationFormData) => {
    try {
      console.log('Submitting quotation form with data:', data);
      console.log('Using wastage percentage:', wastagePercentage);
      
      // Prepare quotation items using the passed wastage percentage
      const quotationItems = selectedRoomsData.map(roomData => ({
        tile_id: roomData.tileId,
        room_id: roomData.roomId,
        area: roomData.quantity,
        price_per_box: 100, // Placeholder price
        total_price: (roomData.quantity * (1 + (wastagePercentage / 100))) * 100,
      }));

      const quotationData: CreateQuotationData = {
        quotation_number: data.quotationNumber,
        customer_id: data.customerId,
        worker_id: user?.id || '',
        total_cost: grandTotal,
        status: data.status,
        notes: data.notes || undefined,
        wastage_percentage: wastagePercentage, // Store the selected wastage percentage
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

  if (customersLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-4xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Quotation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            {/* Display the selected wastage percentage (read-only) */}
            <div className="bg-blue-50 p-4 rounded-lg border">
              <Label className="text-sm font-medium text-blue-700">
                Wastage Percentage Applied: {wastagePercentage}%
              </Label>
              <p className="text-xs text-blue-600 mt-1">
                This percentage was selected in the tile selection step and will be included in all calculations.
              </p>
            </div>

            <div>
              <Label>Total Cost</Label>
              <div className="font-bold text-2xl">₹{grandTotal.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                Includes {wastagePercentage}% wastage allowance
              </p>
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

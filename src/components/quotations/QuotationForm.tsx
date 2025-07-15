
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { useCustomers } from "@/hooks/useCustomers";
import { useWorkers } from "@/hooks/useWorkers";
import { useTiles } from "@/hooks/useTiles";
import { useQuotations } from "@/hooks/useQuotations";
import { calculateTileRequirements, calculateGrandTotal } from "@/utils/tileCalculations";
import type { TileCalculationResult } from "@/utils/tileCalculations";
import { FloorTileSelection, WallTileSelection } from "@/utils/tileCalculations";
import { prepareQuotationItems } from "@/utils/tileCalculations";
import { formatTileBreakdown } from "@/utils/tileCalculations";

const quotationFormSchema = z.object({
  quotation_number: z.string().min(3, {
    message: "Quotation number must be at least 3 characters.",
  }),
  customer_id: z.string().uuid({
    message: "Please select a customer.",
  }),
  worker_id: z.string().uuid({
    message: "Please select a worker.",
  }),
  status: z.string().optional(),
  notes: z.string().optional(),
  wastage_percentage: z.number().min(0).max(15).default(5),
});

type QuotationFormValues = z.infer<typeof quotationFormSchema>;

interface QuotationFormProps {
  customerId?: string;
  initialData?: any;
  onBack: () => void;
  onSuccess?: () => void;
}

export const QuotationForm = ({ customerId, initialData, onBack, onSuccess }: QuotationFormProps) => {
  const navigate = useNavigate();
  const [floorSelections, setFloorSelections] = useState<FloorTileSelection[]>([]);
  const [wallSelections, setWallSelections] = useState<WallTileSelection[]>([]);
  const [calculations, setCalculations] = useState<TileCalculationResult[]>([]);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [wastagePercentage, setWastagePercentage] = useState<number>(5);

  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();
  const { data: workers = [], isLoading: isWorkersLoading } = useWorkers();
  const { data: tiles = [], isLoading: isTilesLoading } = useTiles();
  const { createQuotation, isCreating } = useQuotations();

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotation_number: initialData?.quotation_number || `Q-${Date.now()}`,
      customer_id: customerId || initialData?.customer_id || '',
      worker_id: initialData?.worker_id || '',
      status: initialData?.status || 'draft',
      notes: initialData?.notes || '',
      wastage_percentage: initialData?.wastage_percentage || 5,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (calculations.length > 0) {
      setGrandTotal(calculateGrandTotal(calculations));
    }
  }, [calculations, wastagePercentage]);

  const onSubmit = async (data: QuotationFormValues) => {
    if (calculations.length === 0) {
      toast.error("Please select tiles for at least one room.");
      return;
    }

    const quotationItems = prepareQuotationItems(
      floorSelections,
      wallSelections,
      [],
      tiles,
      wastagePercentage
    );

    try {
      await createQuotation({
        quotation_number: data.quotation_number,
        customer_id: data.customer_id,
        worker_id: data.worker_id,
        status: data.status,
        notes: data.notes,
        wastage_percentage: data.wastage_percentage,
        total_cost: grandTotal,
        items: quotationItems,
      });

      toast.success("Quotation created successfully!");
      onSuccess?.();
      navigate('/quotations');
    } catch (error: any) {
      console.error("Error creating quotation:", error);
      toast.error(error?.message || "Failed to create quotation.");
    }
  };

  if (isCustomersLoading || isWorkersLoading || isTilesLoading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          Go Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Quotation</h1>
          <p className="text-muted-foreground">
            Fill in the details to create a new quotation
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="quotation_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quotation Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Q-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.mobile})
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
                name="worker_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Worker</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a worker" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workers?.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name} ({worker.email})
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
                name="wastage_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wastage Percentage (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="15"
                        defaultValue="5"
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setWastagePercentage(value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the percentage of wastage to be considered for tile calculations (0-15%).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes for the quotation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Quotation"}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
      
      {/* Tile Calculations Summary */}
      {calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tile Requirements Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculations.map((calc, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">
                        {calc.tile.name} ({calc.tile.code})
                        {calc.isWallTile && (
                          <span className="text-sm text-blue-600 ml-2">Wall Tile</span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Rooms: {calc.rooms.map(r => r.name).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{calc.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Area</p>
                      <p className="font-medium">{calc.totalArea.toFixed(2)} sq ft</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tiles Required</p>
                      <p className="font-medium text-green-600">
                        {calc.rawTilesNeeded} tiles
                        <span className="text-xs text-gray-500 block">
                          {formatTileBreakdown(calc.fullBoxes, calc.leftoverTiles)}
                          <br />
                          (+{wastagePercentage}% wastage)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Boxes to Order</p>
                      <p className="font-medium text-blue-600">
                        {calc.boxesNeeded} boxes
                        <span className="text-xs text-gray-500 block">
                          ({calc.orderedTiles} tiles total)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Price per Box</p>
                      <p className="font-medium">₹{calc.tile.price_per_box}</p>
                      <p className="text-xs text-gray-500">{calc.tile.pieces_per_box} tiles/box</p>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Grand Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

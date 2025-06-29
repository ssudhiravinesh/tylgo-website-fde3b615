
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, User, Phone, MapPin } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import { useTiles } from "@/hooks/useTiles";
import { useQuotations } from "@/hooks/useQuotations";
import { MobileNumberSearch } from "@/components/customers/MobileNumberSearch";
import { toast } from "sonner";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import { supabase } from "@/integrations/supabase/client";
import type { Quotation } from "@/hooks/useQuotations";

interface QuotationFormProps {
  onBack: () => void;
  preSelectedCustomerId?: string;
  selectedRoomsData?: Array<{
    roomId: string;
    tileId: string;
    quantity: number;
    wastagePercentage: number;
  }>;
  wastagePercentage?: number;
  onSuccess?: () => void;
  editMode?: boolean;
  existingQuotation?: Quotation;
}

export const QuotationForm = ({ 
  onBack, 
  preSelectedCustomerId, 
  selectedRoomsData = [],
  wastagePercentage = 10,
  onSuccess,
  editMode = false,
  existingQuotation
}: QuotationFormProps) => {
  const [formData, setFormData] = useState({
    customer_id: preSelectedCustomerId || existingQuotation?.customer_id || "",
    notes: existingQuotation?.notes || "",
    status: (existingQuotation?.status as "draft" | "pending" | "approved" | "rejected") || "draft"
  });

  const [quotationItems, setQuotationItems] = useState<Array<{
    roomId: string;
    tileId: string;
    area: number;
    pricePerBox: number;
    wastagePercentage?: number;
  }>>([]);

  const [currentUser, setCurrentUser] = useState<any>(null);

  const { data: customers = [] } = useCustomers();
  const { data: rooms = [] } = useRoomsByCustomer(formData.customer_id);
  const { data: tiles = [] } = useTiles();
  const { createQuotation, updateQuotation, isCreating, isUpdating } = useQuotations();

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Load existing quotation items if in edit mode
  useEffect(() => {
    if (editMode && existingQuotation) {
      // Load quotation items - this would need to be implemented
      // For now, we'll initialize with empty items
      setQuotationItems([]);
    } else if (selectedRoomsData.length > 0) {
      const items = selectedRoomsData.map(item => {
        const tile = tiles.find(t => t.id === item.tileId);
        return {
          roomId: item.roomId,
          tileId: item.tileId,
          area: item.quantity, // Save area as-is without adding wastage
          pricePerBox: tile?.price_per_box || 0,
          wastagePercentage: item.wastagePercentage
        };
      });
      setQuotationItems(items);
    }
  }, [selectedRoomsData, tiles, editMode, existingQuotation]);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    mobile: "",
    address: ""
  });

  useEffect(() => {
    if (formData.customer_id) {
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      if (selectedCustomer) {
        setCustomerDetails({
          name: selectedCustomer.name,
          mobile: selectedCustomer.mobile,
          address: selectedCustomer.address || ""
        });
      } else {
        setCustomerDetails({ name: "", mobile: "", address: "" });
      }
    } else {
      setCustomerDetails({ name: "", mobile: "", address: "" });
    }
  }, [formData.customer_id, customers]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerSelect = (customerId: string) => {
    setFormData(prev => ({ ...prev, customer_id: customerId }));
  };

  const handleAddItem = () => {
    setQuotationItems(prev => [...prev, { roomId: "", tileId: "", area: 0, pricePerBox: 0 }]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...quotationItems];
    updatedItems[index][field] = value;
    setQuotationItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...quotationItems];
    updatedItems.splice(index, 1);
    setQuotationItems(updatedItems);
  };

  const calculateTotalCost = () => {
    return quotationItems.reduce((sum, item) => {
      const tile = tiles.find(t => t.id === item.tileId);
      if (!tile || !tile.size_length || !tile.size_breadth || !tile.pieces_per_box || !tile.price_per_box) {
        return sum;
      }

      // Calculate tile area in square feet
      const tileLengthFt = tile.size_length / 304.8; // mm to ft
      const tileBreadthFt = tile.size_breadth / 304.8; // mm to ft
      const tileAreaSqFt = tileLengthFt * tileBreadthFt;

      if (tileAreaSqFt > 0) {
        // Step 1: Calculate basic tiles needed
        const basicTilesNeeded = Math.ceil(item.area / tileAreaSqFt);
        
        // Step 2: Add wastage percentage to tiles
        const tilesWithWastage = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
        
        // Step 3: Calculate boxes needed
        const boxesNeeded = Math.ceil(tilesWithWastage / tile.pieces_per_box);
        
        // Step 4: Calculate price
        return sum + (boxesNeeded * tile.price_per_box);
      }
      
      return sum;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.error("Please select a customer");
      return;
    }

    if (quotationItems.length === 0) {
      toast.error("Please add at least one item to the quotation");
      return;
    }

    if (!currentUser) {
      toast.error("User not authenticated");
      return;
    }

    try {
      const totalCost = calculateTotalCost();
      
      if (editMode && existingQuotation) {
        const items = quotationItems.map(item => ({
          tile_id: item.tileId,
          room_id: item.roomId,
          area: item.area,
          price_per_box: item.pricePerBox,
          total_price: item.area * item.pricePerBox
        }));

        await updateQuotation({
          id: existingQuotation.id,
          customer_id: formData.customer_id,
          notes: formData.notes,
          status: formData.status,
          total_cost: totalCost,
          items
        });
      } else {
        // Generate quotation number (simple implementation)
        const quotationNumber = `QUO-${Date.now()}`;
        
        const items = quotationItems.map(item => ({
          tile_id: item.tileId,
          room_id: item.roomId,
          area: item.area,
          price_per_box: item.pricePerBox,
          total_price: item.area * item.pricePerBox
        }));

        const quotationData = {
          quotation_number: quotationNumber,
          customer_id: formData.customer_id,
          worker_id: currentUser.id,
          total_cost: totalCost,
          notes: formData.notes,
          status: formData.status,
          items
        };

        await createQuotation(quotationData);
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        onBack();
      }
    } catch (error) {
      console.error("Error saving quotation:", error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {editMode ? `Edit Quotation ${existingQuotation?.quotation_number}` : "Create Quotation"}
          </h1>
          <p className="text-gray-600">
            {editMode ? "Update quotation details" : "Enter quotation details to generate a new record"}
          </p>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            Quotation Information
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="customer_id" className="text-sm font-medium text-gray-700">
                Customer *
              </Label>
              <MobileNumberSearch
                value={customerDetails.mobile}
                onChange={(value) => setCustomerDetails(prev => ({ ...prev, mobile: value }))}
                onCustomerFound={(customer) => {
                  if (customer) {
                    handleCustomerSelect(customer.id);
                    setCustomerDetails({
                      name: customer.name,
                      mobile: customer.mobile,
                      address: customer.address || ""
                    });
                  } else {
                    handleCustomerSelect("");
                    setCustomerDetails({ name: "", mobile: "", address: "" });
                  }
                }}
                placeholder="Enter customer mobile number"
                searchType="customer"
              />
              {customerDetails.name && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-100">
                  <p className="text-sm font-medium text-gray-800">
                    {customerDetails.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {customerDetails.address || "No address available"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional notes for the quotation"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: "draft" | "pending" | "approved" | "rejected") => handleInputChange("status", value)}
              >
                <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editMode ? (isUpdating ? "Updating..." : "Update Quotation") : (isCreating ? "Creating..." : "Create Quotation")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

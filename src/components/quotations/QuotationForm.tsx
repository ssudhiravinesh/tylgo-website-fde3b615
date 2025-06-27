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
import { useCreateQuotation } from "@/hooks/useQuotations";
import { MobileNumberSearch } from "@/components/customers/MobileNumberSearch";
import { toast } from "sonner";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";

interface QuotationFormProps {
  onBack: () => void;
  preSelectedCustomerId?: string;
  selectedRoomsData?: Array<{
    roomId: string;
    tileId: string;
    quantity: number;
    wastagePercentage: number;
  }>;
  onSuccess?: () => void;
}

export const QuotationForm = ({ 
  onBack, 
  preSelectedCustomerId, 
  selectedRoomsData = [],
  onSuccess 
}: QuotationFormProps) => {
  const [formData, setFormData] = useState({
    customer_id: preSelectedCustomerId || "",
    notes: "",
    status: "draft" as "draft" | "pending" | "approved" | "rejected"
  });

  const [quotationItems, setQuotationItems] = useState<Array<{
    roomId: string;
    tileId: string;
    area: number;
    pricePerBox: number;
    wastagePercentage?: number;
  }>>([]);

  const { data: customers = [] } = useCustomers();
  const { data: rooms = [] } = useRoomsByCustomer(formData.customer_id);
  const { data: tiles = [] } = useTiles();
  const createQuotation = useCreateQuotation();

  useEffect(() => {
    if (selectedRoomsData.length > 0) {
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
  }, [selectedRoomsData, tiles]);

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

    try {
      const quotationData = {
        customer_id: formData.customer_id,
        notes: formData.notes,
        status: formData.status,
        items: quotationItems.map(item => ({
          room_id: item.roomId,
          tile_id: item.tileId,
          area: item.area, // Save original area without wastage
          price_per_box: item.pricePerBox,
          total_price: item.area * item.pricePerBox
        }))
      };

      await createQuotation.mutateAsync(quotationData);
      
      if (onSuccess) {
        onSuccess();
      } else {
        onBack();
      }
    } catch (error) {
      console.error("Error creating quotation:", error);
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
          <h1 className="text-2xl font-bold text-gray-800">Create Quotation</h1>
          <p className="text-gray-600">Enter quotation details to generate a new record</p>
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

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">Quotation Items</h3>
              {quotationItems.map((item, index) => (
                <div key={index} className="grid grid-cols-4 gap-4 items-center">
                  <div className="space-y-1">
                    <Label htmlFor={`room-${index}`} className="text-sm font-medium text-gray-700">
                      Room
                    </Label>
                    <Select
                      value={item.roomId}
                      onValueChange={(value) => handleItemChange(index, "roomId", value)}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map(room => (
                          <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`tile-${index}`} className="text-sm font-medium text-gray-700">
                      Tile
                    </Label>
                    <Select
                      value={item.tileId}
                      onValueChange={(value) => handleItemChange(index, "tileId", value)}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select tile" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiles.map(tile => (
                          <SelectItem key={tile.id} value={tile.id}>{tile.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`area-${index}`} className="text-sm font-medium text-gray-700">
                      Area (sq ft)
                    </Label>
                    <Input
                      type="number"
                      id={`area-${index}`}
                      placeholder="Enter area"
                      value={item.area}
                      onChange={(e) => handleItemChange(index, "area", parseFloat(e.target.value))}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`price-${index}`} className="text-sm font-medium text-gray-700">
                      Price per Box
                    </Label>
                    <Input
                      type="number"
                      id={`price-${index}`}
                      placeholder="Enter price"
                      value={item.pricePerBox}
                      onChange={(e) => handleItemChange(index, "pricePerBox", parseFloat(e.target.value))}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={handleAddItem}>
                Add Item
              </Button>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createQuotation.isPending}
              >
                {createQuotation.isPending ? "Creating..." : "Create Quotation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

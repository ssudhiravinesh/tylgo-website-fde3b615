
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User, Phone, MapPin } from "lucide-react";
import { useCreateCustomer } from "@/hooks/useCustomers";

interface CustomerFormProps {
  onBack: () => void;
}

export const CustomerForm = ({ onBack }: CustomerFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: ""
  });
  
  const createCustomer = useCreateCustomer();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createCustomer.mutateAsync(formData);
      onBack();
    } catch (error) {
      console.error("Error creating customer:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-800">Add New Customer</h1>
          <p className="text-gray-600">Enter customer details to create a new record</p>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-blue-600" />
            Customer Information
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  placeholder="Enter customer's full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-sm font-medium text-gray-700">
                Mobile Number *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange("mobile", e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                Address *
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="address"
                  placeholder="Enter complete address with pincode"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="pl-10 pt-3 min-h-[100px] border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  required
                />
              </div>
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
                disabled={createCustomer.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {createCustomer.isPending ? "Saving..." : "Save Customer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

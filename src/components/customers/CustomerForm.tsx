import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, User, MapPin, FileText } from "lucide-react";
import { useCreateCustomer, useCustomers, Customer } from "@/hooks/useCustomers";
import { MobileNumberSearch } from "./MobileNumberSearch";
import { ReferenceNameSearch } from "./ReferenceNameSearch";
import { toast } from "sonner";
import { getAllStates, getCitiesByState, getStateByPincode } from "@/utils/indianStatesAndCities";

interface CustomerFormProps {
  onBack: () => void;
  onNewQuote?: (customerId: string) => void;
}

export const CustomerForm = ({ onBack, onNewQuote }: CustomerFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    area: "",
    state: "",
    pincode: "",
    category: "Customer",
    reference_name: "",
    reference_mobile_no: ""
  });

  const [errors, setErrors] = useState({
    name: "",
    mobile: "",
    area: "",
    state: "",
    pincode: "",
    reference_name: "",
    reference_mobile_no: ""
  });

  const createCustomer = useCreateCustomer();
  const allStates = getAllStates();


  // Helper function to capitalize words
  const capitalizeWords = (str: string): string => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  const handleInputChange = (field: string, value: string) => {
    const isTextField = ["name", "reference_name", "area", "state"].includes(field);

    setFormData(prev => ({
      ...prev,
      [field]: isTextField ? value.toUpperCase() : value,
    }));

    if (field === "pincode" && value.length === 6) {
      const detectedState = getStateByPincode(value);
      if (detectedState) {
        setFormData(prev => ({ ...prev, state: detectedState.toUpperCase() }));
        if (errors.state) {
          setErrors(prev => ({ ...prev, state: "" }));
        }
      }
    }

    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleInputBlur = (field: string) => {
    if (["name", "reference_name", "area"].includes(field)) {
      setFormData(prev => ({
        ...prev,
        [field]: capitalizeWords(prev[field as keyof typeof prev]),
      }));
    }
  };

  const handleCustomerFound = (customer: Customer | null) => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        name: customer.name,
        area: capitalizeWords((customer as any).area || ""),
        state: (customer as any).state || "",
        pincode: (customer as any).pincode || "",
        reference_name: customer.reference_name || "",
        reference_mobile_no: customer.reference_mobile_no ? customer.reference_mobile_no.replace(/\D/g, '').slice(-10) : ""
      }));
    }
  };

  const handleReferenceFound = (customer: Customer | null) => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        reference_name: capitalizeWords(customer.name),
        reference_mobile_no: customer.mobile.replace(/\D/g, '').slice(-10)
      }));
      // Clear any existing errors for reference fields
      setErrors(prev => ({ 
        ...prev, 
        reference_name: "", 
        reference_mobile_no: "" 
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      mobile: "",
      area: "",
      state: "",
      pincode: "",
      reference_name: "",
      reference_mobile_no: ""
    };

    if (!formData.name.trim()) newErrors.name = "Full name is required";
    const mobileDigits = formData.mobile.replace(/\D/g, '');
    if (!formData.mobile.trim()) newErrors.mobile = "Mobile number is required";
    else if (mobileDigits.length !== 10) newErrors.mobile = "Mobile number must be exactly 10 digits";
    if (!formData.area.trim()) newErrors.area = "Residing area is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(formData.pincode.trim())) newErrors.pincode = "Pincode must be exactly 6 digits";

    if (formData.reference_name.trim() && !formData.reference_mobile_no.trim()) {
      newErrors.reference_mobile_no = "Reference mobile number is required when reference name is provided";
    }

    const refMobileDigits = formData.reference_mobile_no.replace(/\D/g, '');
    if (formData.reference_mobile_no.trim() && refMobileDigits.length !== 10) {
      newErrors.reference_mobile_no = "Reference mobile number must be exactly 10 digits";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    const formattedData = {
      ...formData,
      name: formData.name.trim(),
      area: formData.area.trim(),
      reference_name: formData.reference_name.trim(),
      category: formData.category
    };

    try {
      await createCustomer.mutateAsync(formattedData);
      onBack();
    } catch (error) {
      console.error("Error creating customer:", error);
    }
  };

  const handleSaveAndQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    const formattedData = {
      ...formData,
      name: formData.name.trim(),
      area: formData.area.trim(),
      reference_name: formData.reference_name.trim(),
      category: formData.category
    };

    try {
      const newCustomer = await createCustomer.mutateAsync(formattedData);
      if (onNewQuote && newCustomer?.id) {
        onNewQuote(newCustomer.id);
      }
    } catch (error) {
      console.error("Error creating customer:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Customer</h1>
          <p className="text-muted-foreground">Enter customer details to create a new record</p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Customer Information
            </div>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange("category", value)}
            >
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="Builder">Builder</SelectItem>
                <SelectItem value="Engineer">Engineer</SelectItem>
                <SelectItem value="Layer">Layer</SelectItem>
                <SelectItem value="Architect">Architect</SelectItem>
                <SelectItem value="Contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter customer's full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={() => handleInputBlur("name")}
                  className={`pl-10 h-12 border-border ${
                    errors.name ? "border-red-500" : ""
                  }`}
                />
              </div>
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <MobileNumberSearch
                value={formData.mobile}
                onChange={(value) => handleInputChange("mobile", value)}
                onCustomerFound={handleCustomerFound}
                placeholder="9876543210"
                searchType="customer"
                error={errors.mobile}
              />
              {errors.mobile && <p className="text-sm text-red-600">{errors.mobile}</p>}
            </div>

            {/* Area, State, Pincode */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="area">Residing Area *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                  <Input
                    id="area"
                    type="text"
                    placeholder="e.g., Andheri, Koramangala, CP"
                    value={formData.area}
                    onChange={(e) => handleInputChange("area", e.target.value)}
                    onBlur={() => handleInputBlur("area")}
                    className={`pl-10 h-12 border-border ${
                      errors.area ? "border-red-500" : ""
                    }`}
                  />
                </div>
                {errors.area && <p className="text-sm text-red-600">{errors.area}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleInputChange("state", value)}
                  >
                    <SelectTrigger className={`h-12 border-border ${errors.state ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {allStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && <p className="text-sm text-red-600">{errors.state}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    type="text"
                    maxLength={6}
                    placeholder="400001"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange("pincode", e.target.value.replace(/\D/g, ""))}
                    className={`h-12 border-border ${errors.pincode ? "border-red-500" : ""}`}
                  />
                  {errors.pincode && <p className="text-sm text-red-600">{errors.pincode}</p>}
                </div>
              </div>
            </div>

            {/* Reference Info */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Reference Information (Optional)</h3>
              <div className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="reference_name">Reference Name</Label>
                   <ReferenceNameSearch
                     value={formData.reference_name}
                     onValueChange={(value) => handleInputChange("reference_name", value)}
                     onMobileChange={(mobile) => handleInputChange("reference_mobile_no", mobile)}
                     placeholder="Enter reference name"
                   />
                   {errors.reference_name && <p className="text-sm text-red-600">{errors.reference_name}</p>}
                 </div>

          <div className="space-y-2">
            <Label htmlFor="reference_mobile_no">Reference Mobile Number</Label>
            <Input
              id="reference_mobile_no"
              type="text"
              placeholder="9876543210"
              value={formData.reference_mobile_no}
              onChange={(e) => handleInputChange("reference_mobile_no", e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              className={`h-12 border-border ${errors.reference_mobile_no ? "border-red-500" : ""}`}
            />
            {errors.reference_mobile_no && (
              <p className="text-sm text-red-600">{errors.reference_mobile_no}</p>
            )}
          </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">Cancel</Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createCustomer.isPending}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {createCustomer.isPending ? "Saving..." : "Save Customer"}
              </Button>
              {onNewQuote && (
                <Button
                  type="button"
                  onClick={handleSaveAndQuote}
                  disabled={createCustomer.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {createCustomer.isPending ? "Saving..." : "New Quote"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

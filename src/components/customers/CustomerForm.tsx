
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, User, MapPin, FileText } from "lucide-react";
import { useCreateCustomer, useCustomers, Customer } from "@/hooks/useCustomers";
import { MobileNumberSearch } from "./MobileNumberSearch";
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

  const capitalizeWords = (value: string) => {
    return value
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };
  
  const handleInputChange = (field: string, value: string) => {
    // Realtime formatting only for names
    const formattedValue = ["name", "reference_name"].includes(field)
      ? capitalizeWords(value)
      : value;
  
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  
    // Handle pincode-based state autopopulation
    if (field === "pincode" && value.length === 6) {
      const detectedState = getStateByPincode(value);
      if (detectedState) {
        setFormData(prev => ({ ...prev, state: detectedState }));
        if (errors.state) {
          setErrors(prev => ({ ...prev, state: "" }));
        }
      }
    }

    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleCustomerFound = (customer: Customer | null) => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        name: customer.name,
        area: (customer as any).area || "",
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
        reference_name: customer.name
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

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    // Validate mobile - now expecting exactly 10 digits
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else {
      const mobileDigits = formData.mobile.replace(/\D/g, '');
      if (mobileDigits.length !== 10) {
        newErrors.mobile = "Mobile number must be exactly 10 digits";
      }
    }

    // Validate area
    if (!formData.area.trim()) {
      newErrors.area = "Residing area is required";
    }

    // Validate state
    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    // Validate pincode
    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = "Pincode must be exactly 6 digits";
    }

    // Validate reference mobile if reference name is provided
    if (formData.reference_name.trim() && !formData.reference_mobile_no.trim()) {
      newErrors.reference_mobile_no = "Reference mobile number is required when reference name is provided";
    }

    // Validate reference mobile format if provided - now expecting exactly 10 digits
    if (formData.reference_mobile_no.trim()) {
      const refMobileDigits = formData.reference_mobile_no.replace(/\D/g, '');
      if (refMobileDigits.length !== 10) {
        newErrors.reference_mobile_no = "Reference mobile number must be exactly 10 digits";
      }
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
      name: capitalizeWords(formData.name),
      reference_name: capitalizeWords(formData.reference_name)
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
      name: capitalizeWords(formData.name),
      reference_name: capitalizeWords(formData.reference_name)
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
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  inputMode="text"
                  autoComplete="name"
                  placeholder="Enter customer's full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                    errors.name ? "border-red-500" : ""
                  }`}
                  required
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-sm font-medium text-gray-700">
                Mobile Number *
              </Label>
              <MobileNumberSearch
                value={formData.mobile}
                onChange={(value) => handleInputChange("mobile", value)}
                onCustomerFound={handleCustomerFound}
                placeholder="9876543210"
                searchType="customer"
                error={errors.mobile}
              />
              {errors.mobile && (
                <p className="text-sm text-red-600">{errors.mobile}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="area" className="text-sm font-medium text-gray-700">
                  Residing Area *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="area"
                    type="text"
                    inputMode="text"
                    autoComplete="address-level2"
                    placeholder="e.g., Andheri, Koramangala, CP"
                    value={formData.area}
                    onChange={(e) => handleInputChange("area", e.target.value)}
                    className={`pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                      errors.area ? "border-red-500" : ""
                    }`}
                    required
                  />
                </div>
                {errors.area && (
                  <p className="text-sm text-red-600">{errors.area}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                    State *
                  </Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => handleInputChange("state", value)}
                  >
                    <SelectTrigger className={`h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                      errors.state ? "border-red-500" : ""
                    }`}>
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
                  {errors.state && (
                    <p className="text-sm text-red-600">{errors.state}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode" className="text-sm font-medium text-gray-700">
                    Pincode *
                  </Label>
                  <Input
                    id="pincode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="postal-code"
                    placeholder="400001"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange("pincode", e.target.value.replace(/\D/g, ''))}
                    className={`h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                      errors.pincode ? "border-red-500" : ""
                    }`}
                    required
                  />
                  {errors.pincode && (
                    <p className="text-sm text-red-600">{errors.pincode}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Reference Information Section */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Reference Information (Optional)</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reference_name" className="text-sm font-medium text-gray-700">
                    Reference Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reference_name"
                      type="text"
                      inputMode="text"
                      autoComplete="name"
                      placeholder="Enter reference person's name"
                      value={formData.reference_name}
                      onChange={(e) => handleInputChange("reference_name", e.target.value)}
                      className={`pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                        errors.reference_name ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.reference_name && (
                    <p className="text-sm text-red-600">{errors.reference_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_mobile_no" className="text-sm font-medium text-gray-700">
                    Reference Mobile Number
                  </Label>
                  <MobileNumberSearch
                    value={formData.reference_mobile_no}
                    onChange={(value) => handleInputChange("reference_mobile_no", value)}
                    onCustomerFound={handleReferenceFound}
                    placeholder="9876543210"
                    searchType="reference"
                    label="references"
                    error={errors.reference_mobile_no}
                  />
                  {errors.reference_mobile_no && (
                    <p className="text-sm text-red-600">{errors.reference_mobile_no}</p>
                  )}
                </div>
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
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

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User, MapPin, FileText, Phone, Search } from "lucide-react";
import { useCreateCustomer, useCustomers, Customer } from "@/hooks/useCustomers";
import { toast } from "sonner";

interface CustomerFormProps {
  onBack: () => void;
  onNewQuote?: (customerId: string) => void;
}

export const CustomerForm = ({ onBack, onNewQuote }: CustomerFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: "",
    reference_name: "",
    reference_mobile_no: ""
  });
  
  const [errors, setErrors] = useState({
    name: "",
    mobile: "",
    address: "",
    reference_name: "",
    reference_mobile_no: ""
  });

  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const [referenceMobileSearchTerm, setReferenceMobileSearchTerm] = useState("");
  const [showMobileResults, setShowMobileResults] = useState(false);
  const [showReferenceResults, setShowReferenceResults] = useState(false);
  
  const createCustomer = useCreateCustomer();
  const { data: customers = [] } = useCustomers();

  // Filter customers by mobile number only
  const filteredCustomersByMobile = customers.filter(customer =>
    mobileSearchTerm && customer.mobile.includes(mobileSearchTerm.replace(/\D/g, ''))
  );

  const filteredReferencesByMobile = customers.filter(customer =>
    referenceMobileSearchTerm && customer.mobile.includes(referenceMobileSearchTerm.replace(/\D/g, ''))
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleMobileInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    setMobileSearchTerm(digitsOnly);
    setFormData(prev => ({ ...prev, mobile: digitsOnly }));
    setShowMobileResults(digitsOnly.length > 0 && filteredCustomersByMobile.length > 0);
  };

  const handleReferenceMobileInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    setReferenceMobileSearchTerm(digitsOnly);
    setFormData(prev => ({ ...prev, reference_mobile_no: digitsOnly }));
    setShowReferenceResults(digitsOnly.length > 0 && filteredReferencesByMobile.length > 0);
  };


  const handleCustomerSelect = (customer: Customer) => {
    const cleanMobile = customer.mobile.replace(/\D/g, '').slice(-10);
    setMobileSearchTerm(cleanMobile);
    setFormData(prev => ({
      ...prev,
      mobile: cleanMobile,
      name: customer.name,
      address: customer.address || "",
      reference_name: customer.reference_name || "",
      reference_mobile_no: customer.reference_mobile_no ? customer.reference_mobile_no.replace(/\D/g, '').slice(-10) : ""
    }));
    setShowMobileResults(false);
    toast.success(`Customer "${customer.name}" details loaded!`);
  };

  const handleReferenceSelect = (customer: Customer) => {
    const cleanMobile = customer.mobile.replace(/\D/g, '').slice(-10);
    setReferenceMobileSearchTerm(cleanMobile);
    setFormData(prev => ({
      ...prev,
      reference_mobile_no: cleanMobile,
      reference_name: customer.name
    }));
    setShowReferenceResults(false);
    toast.success(`Reference "${customer.name}" details loaded!`);
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      mobile: "",
      address: "",
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

    // Validate address
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
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
    
    try {
      await createCustomer.mutateAsync(formData);
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
    
    try {
      const newCustomer = await createCustomer.mutateAsync(formData);
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

            <div className="space-y-2 relative">
              <Label htmlFor="mobile" className="text-sm font-medium text-gray-700">
                Mobile Number *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="mobile"
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={(e) => handleMobileInputChange(e.target.value)}
                  onFocus={() => setShowMobileResults(mobileSearchTerm.length > 0 && filteredCustomersByMobile.length > 0)}
                  onBlur={() => setTimeout(() => setShowMobileResults(false), 200)}
                  className={`pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                    errors.mobile ? "border-red-500" : ""
                  }`}
                  required
                />
              </div>
              {errors.mobile && (
                <p className="text-sm text-red-600">{errors.mobile}</p>
              )}
              
              {/* Mobile Search Results */}
              {showMobileResults && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    Existing customers found:
                  </div>
                  {filteredCustomersByMobile.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <User className="h-4 w-4 text-blue-600" />
                        {customer.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Phone className="h-3 w-3 text-green-600" />
                        <span className="font-mono">{customer.mobile.replace(/\D/g, '').slice(-10)}</span>
                      </div>
                      {customer.address && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                          <MapPin className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{customer.address}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                  className={`pl-10 pt-3 min-h-[100px] border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none ${
                    errors.address ? "border-red-500" : ""
                  }`}
                  required
                />
              </div>
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address}</p>
              )}
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

                <div className="space-y-2 relative">
                  <Label htmlFor="reference_mobile_no" className="text-sm font-medium text-gray-700">
                    Reference Mobile Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reference_mobile_no"
                      placeholder="9876543210"
                     value={formData.reference_mobile_no}
                      onChange={(e) => handleReferenceMobileInputChange(e.target.value)}
                      onFocus={() => setShowReferenceResults(referenceMobileSearchTerm.length > 0 && filteredReferencesByMobile.length > 0)}
                      onBlur={() => setTimeout(() => setShowReferenceResults(false), 200)}
                      className={`pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                        errors.reference_mobile_no ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.reference_mobile_no && (
                    <p className="text-sm text-red-600">{errors.reference_mobile_no}</p>
                  )}

                  {/* Reference Mobile Search Results */}
                  {showReferenceResults && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                        Select existing customer as reference:
                      </div>
                      {filteredReferencesByMobile.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleReferenceSelect(customer)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <User className="h-4 w-4 text-blue-600" />
                            {customer.name}
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                              Use as Reference
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="h-3 w-3 text-green-600" />
                            <span className="font-mono">{customer.mobile.replace(/\D/g, '').slice(-10)}</span>
                          </div>
                          {customer.address && (
                            <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                              <MapPin className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{customer.address}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
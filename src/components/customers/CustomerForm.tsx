import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, User, MapPin, FileText, Loader2, Check, MapPinned } from "lucide-react";
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

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousAreaRef = useRef(formData.area);
  // When true, the next area change was programmatic (e.g. pincode lookup filled it in)
  // so we skip the reverse area→pincode lookup to avoid infinite loops
  const skipAreaLookupRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createCustomer = useCreateCustomer();
  const allStates = getAllStates();

  // Helper function to capitalize words
  const capitalizeWords = (str: string): string => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  // ── Area → Pincode/State lookup (debounced) ──
  useEffect(() => {
    const currentArea = formData.area.trim();
    const prevArea = previousAreaRef.current.trim();

    // Case-insensitive comparison so capitalize-on-blur doesn't re-trigger
    if (currentArea.toLowerCase() === prevArea.toLowerCase()) {
      previousAreaRef.current = formData.area;
      return;
    }

    previousAreaRef.current = formData.area;

    // If this area change came from a pincode lookup or suggestion select, skip
    if (skipAreaLookupRef.current) {
      skipAreaLookupRef.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Abort any in-flight area lookup
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (currentArea.length > 2) {
      setIsFetchingLocation(true);
      debounceTimerRef.current = setTimeout(() => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        fetch(`https://api.postalpincode.in/postoffice/${currentArea}`, {
          signal: controller.signal,
        })
          .then(res => res.json())
          .then(data => {
            if (controller.signal.aborted) return;

            if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
              const postOffices = data[0].PostOffice.filter((po: any) => po.Pincode && po.State);
              const searchLower = currentArea.toLowerCase();

              // Priority states — ANUJ's customer base
              const PRIORITY_STATES = ["Tamil Nadu", "Andhra Pradesh"];

              // Score each post office for smart ranking:
              // 1. Exact name match + priority state  (highest)
              // 2. Exact name match + other state
              // 3. Priority state + starts-with match
              // 4. Priority state + substring match
              // 5. Other state + starts-with match
              // 6. Other state + substring match     (lowest)
              const scored = postOffices.map((po: any) => {
                const nameLower = (po.Name || "").toLowerCase();
                const isPriorityState = PRIORITY_STATES.includes(po.State);
                const isExact = nameLower === searchLower;
                const isStartsWith = nameLower.startsWith(searchLower);

                let score = 0;
                if (isExact) score += 100;
                else if (isStartsWith) score += 50;
                if (isPriorityState) score += 25;

                return { ...po, _score: score };
              });

              // Sort by score descending, then alphabetically by name
              scored.sort((a: any, b: any) => {
                if (b._score !== a._score) return b._score - a._score;
                return (a.Name || "").localeCompare(b.Name || "");
              });

              // Get unique Pincode/State combinations, preferring higher-scored entries
              const uniqueSuggestions = scored.reduce((acc: any[], po: any) => {
                const isDuplicate = acc.some(item => item.Pincode === po.Pincode && item.State === po.State);
                if (!isDuplicate) {
                  acc.push(po);
                }
                return acc;
              }, []).slice(0, 5); // Limit to top 5 suggestions

              setLocationSuggestions(uniqueSuggestions);
              
              if (uniqueSuggestions.length === 1) {
                // If there's exactly one match, auto-fill it
                const match = uniqueSuggestions[0];
                setFormData(prev => ({
                  ...prev,
                  state: match.State,
                  pincode: match.Pincode,
                }));
                setErrors(prev => ({
                  ...prev,
                  state: "",
                  pincode: "",
                }));
                setShowSuggestions(false);
              } else if (uniqueSuggestions.length > 1) {
                // If multiple matches, show suggestions dropdown
                setShowSuggestions(true);
                // Use functional updater to read current pincode (avoids stale closure)
                setFormData(prev => {
                  const isValidPincode = uniqueSuggestions.some((po: any) => po.Pincode === prev.pincode);
                  if (!isValidPincode && prev.pincode) {
                    return { ...prev, pincode: "", state: "" };
                  }
                  return prev;
                });
              }
            } else {
              setLocationSuggestions([]);
              setShowSuggestions(false);
              // Smart clearing: if area changed but no results, clear pincode/state if they were previously set
              setFormData(prev => {
                if (prev.pincode) {
                  return { ...prev, pincode: "", state: "" };
                }
                return prev;
              });
            }
          })
          .catch((err) => {
            if (err.name === "AbortError") return;
            setLocationSuggestions([]);
            setShowSuggestions(false);
          })
          .finally(() => {
            if (!controller.signal.aborted) {
              setIsFetchingLocation(false);
            }
          });
      }, 500); // 500ms debounce (slightly longer to reduce API spam)
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      setIsFetchingLocation(false);
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData.area]);

  const handleSuggestionSelect = (suggestion: any) => {
    // Mark next area change as programmatic so we don't re-trigger area lookup
    skipAreaLookupRef.current = true;
    const newArea = capitalizeWords(suggestion.Name);
    previousAreaRef.current = newArea;
    setFormData(prev => ({
      ...prev,
      area: newArea,
      state: suggestion.State,
      pincode: suggestion.Pincode,
    }));
    setErrors(prev => ({
      ...prev,
      area: "",
      state: "",
      pincode: "",
    }));
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleInputChange = (field: string, value: string) => {
    const isTextField = ["name", "reference_name", "area"].includes(field);

    setFormData(prev => ({
      ...prev,
      [field]: isTextField ? value.toUpperCase() : value,
    }));

    if (field === "pincode" && value.length === 6) {
      // Abort any in-flight area lookup — pincode takes priority
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setIsFetchingLocation(false);

      // Instant state detection from local pincode ranges
      const detectedState = getStateByPincode(value);
      if (detectedState) {
        setFormData(prev => ({ ...prev, state: detectedState }));
        if (errors.state) {
          setErrors(prev => ({ ...prev, state: "" }));
        }
      }

      // Fetch area from India Post API
      fetch(`https://api.postalpincode.in/pincode/${value}`)
        .then(res => res.json())
        .then(data => {
          if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
            const postOffices = data[0].PostOffice;

            // Pick the main area by postal hierarchy:
            // Head Post Office > Sub Post Office > Branch Post Office
            const branchPriority: Record<string, number> = {
              "Head Post Office": 3,
              "Sub Post Office": 2,
              "Branch Post Office": 1,
            };

            const mainPostOffice = postOffices.reduce(
              (best: typeof postOffices[0], po: typeof postOffices[0]) => {
                const bestRank = branchPriority[best.BranchType] || 0;
                const poRank = branchPriority[po.BranchType] || 0;
                return poRank > bestRank ? po : best;
              },
              postOffices[0]
            );

            const areaName = (mainPostOffice.Name || "").toUpperCase();
            const apiState = mainPostOffice.State || "";

            // Mark next area change as programmatic to prevent reverse lookup
            if (areaName) {
              skipAreaLookupRef.current = true;
              previousAreaRef.current = areaName;
            }

            setFormData(prev => ({
              ...prev,
              area: areaName || prev.area,
              state: apiState || prev.state,
            }));
            setErrors(prev => ({
              ...prev,
              area: "",
              state: "",
            }));
          }
        })
        .catch(() => {
          // Silently fail — local state detection already ran
        });
    }

    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleInputBlur = (field: string) => {
    if (["name", "reference_name", "area"].includes(field)) {
      // Sync previousAreaRef BEFORE setting capitalized value
      // so the useEffect sees no meaningful change
      if (field === "area") {
        const capitalized = capitalizeWords(formData[field]);
        previousAreaRef.current = capitalized;
      }
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
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter customer's full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={() => handleInputBlur("name")}
                  className={`h-12 border-border ${
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
                  <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70 z-10" />
                  <Input
                    id="area"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g., Andheri, Koramangala, CP"
                    value={formData.area}
                    onChange={(e) => handleInputChange("area", e.target.value)}
                    onBlur={() => {
                      // Delay hiding so click on suggestion registers first
                      setTimeout(() => setShowSuggestions(false), 200);
                      handleInputBlur("area");
                    }}
                    onFocus={() => {
                      if (locationSuggestions.length > 1) setShowSuggestions(true);
                    }}
                    className={`pl-10 pr-10 h-12 border-border w-full ${
                      errors.area ? "border-red-500" : ""
                    }`}
                  />
                  {isFetchingLocation && (
                    <div className="absolute right-3 top-3.5 z-10">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* Live suggestion dropdown */}
                  {showSuggestions && locationSuggestions.length > 1 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden">
                      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border">
                        Select exact location
                      </p>
                      {locationSuggestions.map((suggestion, idx) => {
                        const isSelected = formData.pincode === suggestion.Pincode && formData.state === suggestion.State;
                        return (
                          <button
                            key={`${suggestion.Pincode}-${idx}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                              isSelected ? "bg-accent/50" : ""
                            }`}
                          >
                            <MapPinned className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{suggestion.Name}</span>
                              <span className="text-xs text-muted-foreground">
                                {suggestion.State} • {suggestion.Pincode}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
                    inputMode="numeric"
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
              inputMode="numeric"
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
            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1 min-w-[80px]">Cancel</Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createCustomer.isPending}
                className="flex-1 min-w-[80px] bg-gray-600 hover:bg-gray-700 text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {createCustomer.isPending ? "Saving..." : "Save"}
              </Button>
              {onNewQuote && (
                <Button
                  type="button"
                  onClick={handleSaveAndQuote}
                  disabled={createCustomer.isPending}
                  className="flex-1 min-w-[80px] bg-primary hover:bg-primary/90 text-white gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {createCustomer.isPending ? "Saving..." : "Quote"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};


import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Store, ChevronRight, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface HierarchyWrapperProps {
    children: (ids: { brandId: string; showroomId?: string }) => React.ReactNode;
    requireShowroom?: boolean;
    title: string;
    description: string;
}

interface Brand {
    id: string;
    name: string;
}

interface Showroom {
    id: string;
    name: string;
    brand_id: string;
}

export const HierarchyWrapper = ({
    children,
    requireShowroom = false,
    title,
    description
}: HierarchyWrapperProps) => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [showrooms, setShowrooms] = useState<Showroom[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [selectedShowroom, setSelectedShowroom] = useState<Showroom | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch brands on mount
    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const { data, error } = await supabase
                    .from('brands')
                    .select('id, name')
                    .order('name');

                if (error) throw error;
                setBrands(data || []);
            } catch (error) {
                console.error("Error fetching brands:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBrands();
    }, []);

    // Fetch showrooms when brand is selected
    useEffect(() => {
        if (selectedBrand && requireShowroom) {
            const fetchShowrooms = async () => {
                try {
                    const { data, error } = await supabase
                        .from('showrooms')
                        .select('id, name, brand_id')
                        .eq('brand_id', selectedBrand.id)
                        .order('name');

                    if (error) throw error;
                    setShowrooms(data || []);
                } catch (error) {
                    console.error("Error fetching showrooms:", error);
                }
            };
            fetchShowrooms();
        }
    }, [selectedBrand, requireShowroom]);

    const handleBrandSelect = (brand: Brand) => {
        setSelectedBrand(brand);
        // If we don't require showroom, we're done here
        if (!requireShowroom) {
            // Logic handled by render condition
        }
    };

    const handleShowroomSelect = (showroom: Showroom) => {
        setSelectedShowroom(showroom);
    };

    const resetSelection = () => {
        setSelectedBrand(null);
        setSelectedShowroom(null);
        setShowrooms([]);
    };

    const resetShowroom = () => {
        setSelectedShowroom(null);
    };

    // 1. Loading State
    if (isLoading) {
        return (
            <div className="p-8 space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        );
    }

    // 2. Resource View (Final State)
    // If brand is selected AND (showroom is selected OR showroom not required)
    if (selectedBrand && (!requireShowroom || selectedShowroom)) {
        return (
            <div className="space-y-4">
                {/* Breadcrumb Navigation Header */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 bg-white p-3 rounded-lg border shadow-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent font-normal"
                        onClick={resetSelection}
                    >
                        All Brands
                    </Button>
                    <ChevronRight className="h-4 w-4" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-auto p-0 hover:bg-transparent font-normal ${!requireShowroom ? "font-semibold text-gray-900" : ""}`}
                        onClick={requireShowroom ? resetShowroom : undefined}
                        disabled={!requireShowroom}
                    >
                        {selectedBrand.name}
                    </Button>
                    {selectedShowroom && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className="font-semibold text-gray-900">{selectedShowroom.name}</span>
                        </>
                    )}
                </div>

                {/* Render Children with IDs */}
                {children({
                    brandId: selectedBrand.id,
                    showroomId: selectedShowroom?.id
                })}
            </div>
        );
    }

    // 3. Showroom Selection View
    if (selectedBrand && requireShowroom) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={resetSelection}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Select Showroom</h2>
                        <p className="text-muted-foreground">Select a showroom under {selectedBrand.name} to view {title.toLowerCase()}.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {showrooms.length > 0 ? (
                        showrooms.map((showroom) => (
                            <Card
                                key={showroom.id}
                                className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                                onClick={() => handleShowroomSelect(showroom)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-medium group-hover:text-blue-600 transition-colors">
                                        {showroom.name}
                                    </CardTitle>
                                    <Store className="h-4 w-4 text-muted-foreground group-hover:text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>Click to manage</CardDescription>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            <Store className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                            <p>No showrooms found for this brand.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 4. Brand Selection View (Initial State)
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h2>
                <p className="text-muted-foreground">{description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {brands.map((brand) => (
                    <Card
                        key={brand.id}
                        className="cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
                        onClick={() => handleBrandSelect(brand)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-bold group-hover:text-indigo-600 transition-colors">
                                {brand.name}
                            </CardTitle>
                            <Building2 className="h-5 w-5 text-muted-foreground group-hover:text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <CardDescription>Select to proceed</CardDescription>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

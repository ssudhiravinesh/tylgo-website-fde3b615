import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GridLoader } from "@/components/ui/GridLoader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus, Minus, ShoppingBag } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useAddCustomerProduct } from "@/hooks/useCustomerProducts";
import { toast } from "sonner";

interface ProductSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
}

const CATEGORIES = [
    "All Categories",
    "Western Toilet",
    "Wash Basin",
    "Wash Basin / Pedestal",
    "Mirror",
    "Sink",
    "Faucets",
    "Showers",
    "Accessories",
    "Other"
];

export const ProductSelectionDialog = ({ isOpen, onClose, customerId }: ProductSelectionDialogProps) => {
    const { data: products = [], isLoading } = useProducts();
    const addProductMutation = useAddCustomerProduct();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.code && product.code.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === "All Categories" || product.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const handleQuantityChange = (productId: string, delta: number) => {
        setQuantities(prev => {
            const current = prev[productId] || 0;
            const next = Math.max(0, current + delta);
            return { ...prev, [productId]: next };
        });
    };

    const handleAddProduct = async (product: any) => {
        const quantity = quantities[product.id] || 1;

        try {
            await addProductMutation.mutateAsync({
                customer_id: customerId,
                product_id: product.id,
                quantity: quantity
            });
            // Reset quantity for this product
            setQuantities(prev => ({ ...prev, [product.id]: 0 }));
            // Optional: Close dialog or keep open for more selections
            toast.success(`${product.name} added to customer`);
        } catch (error) {
            // Error handled by mutation
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        Select Products from Catalogue
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col md:flex-row gap-4 my-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="md:w-64">
                        <Select
                            value={selectedCategory}
                            onValueChange={setSelectedCategory}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {isLoading ? (
                        <GridLoader className="py-12 min-h-[300px]" loadingText="Loading products..." />
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed">
                            <Filter className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No products found</h3>
                            <p className="mt-1 text-gray-500">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="border rounded-lg p-3 flex flex-col gap-3 hover:shadow-md transition-shadow bg-white">
                                    <div className="flex gap-3">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-16 h-16 object-cover rounded bg-gray-100"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                                                <ShoppingBag className="h-6 w-6" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm text-gray-900 truncate" title={product.name}>
                                                {product.name}
                                            </h4>
                                            <p className="text-xs text-gray-500">{product.code}</p>
                                            <p className="text-sm font-semibold text-blue-600 mt-1">₹{product.price}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-auto pt-2 border-t">
                                        <div className="flex items-center border rounded-md">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-r-none"
                                                onClick={() => handleQuantityChange(product.id, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm font-medium">
                                                {quantities[product.id] || 1}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-l-none"
                                                onClick={() => handleQuantityChange(product.id, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button
                                            className="flex-1 h-8 text-xs gap-1"
                                            size="sm"
                                            onClick={() => handleAddProduct(product)}
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

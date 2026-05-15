
import { useState } from "react";
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { AddProductDialog } from "./AddProductDialog";
import { GridLoader } from "@/components/ui/GridLoader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Filter, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface ProductCatalogProps {
    userRole: "admin" | "worker" | "super_admin";
    onSelect?: (product: any) => void;
    brandId?: string;
    showroomId?: string;
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

export const ProductCatalog = ({ userRole, onSelect, brandId, showroomId }: ProductCatalogProps) => {
    const { data: products = [], isLoading, error, refetch } = useProducts(false, brandId);
    const deleteProduct = useDeleteProduct();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.code && product.code.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === "All Categories" || product.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const handleDelete = async (productId: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            await deleteProduct.mutateAsync(productId);
        }
    };

    const handleEdit = (product: any) => {
        setEditingProduct(product);
        setIsAddDialogOpen(true);
    };

    const isAdmin = userRole === "admin" || userRole === "super_admin";

    return (
        <div className="space-y-6">
            <div className="pb-4 pt-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Product Catalog</h1>
                        <p className="text-muted-foreground mt-1">Manage non-tile inventory items</p>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Product
                        </Button>
                    )}
                </div>

                <Card className="p-4 shadow-sm border-border">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
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
                        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            </div>

            {
                isLoading ? (
                    <GridLoader className="py-12 min-h-[300px]" loadingText="Loading products..." />
                ) : error ? (
                    <div className="text-center py-12 text-red-500">
                        Failed to load products. Please try again.
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-16 bg-card rounded-lg border border-dashed">
                        <div className="mx-auto h-12 w-12 text-muted-foreground/70 mb-3">
                            <Filter className="h-12 w-12" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">No products found</h3>
                        <p className="mt-1 text-muted-foreground mb-6">
                            {searchTerm || selectedCategory !== "All Categories"
                                ? "Try adjusting your filters or search terms."
                                : "Get started by adding your first product."}
                        </p>
                        {isAdmin && (
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Product
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                isAdmin={isAdmin && !onSelect} // Hide admin controls in selection mode
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onSelect={onSelect ? () => onSelect(product) : undefined}
                            />
                        ))}
                    </div>
                )
            }

            <AddProductDialog
                isOpen={isAddDialogOpen}
                onClose={() => {
                    setIsAddDialogOpen(false);
                    setEditingProduct(null);
                }}
                productToEdit={editingProduct}
            />
        </div >
    );
};

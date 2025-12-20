
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddProduct } from "@/hooks/useProducts";
import { Plus, Trash } from "lucide-react";

interface AddProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = [
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

export const AddProductDialog = ({ isOpen, onClose }: AddProductDialogProps) => {
    const addProduct = useAddProduct();
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        category: "",
        price: "",
        image_url: "",
    });

    // Dimensions state - starting with common ones
    const [dimensions, setDimensions] = useState<{ key: string; value: string }[]>([
        { key: "length", value: "" },
        { key: "width", value: "" },
        { key: "height", value: "" },
    ]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleDimensionChange = (index: number, field: "key" | "value", value: string) => {
        const newDimensions = [...dimensions];
        newDimensions[index][field] = value;
        setDimensions(newDimensions);
    };

    const addDimensionRow = () => {
        setDimensions([...dimensions, { key: "", value: "" }]);
    };

    const removeDimensionRow = (index: number) => {
        setDimensions(dimensions.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Construct dimensions object
        const dimensionsObj: Record<string, any> = {};
        dimensions.forEach(dim => {
            if (dim.key.trim() && dim.value.trim()) {
                const val = dim.value.trim();
                // Try to convert to number if it looks like one
                dimensionsObj[dim.key.trim()] = isNaN(Number(val)) ? val : Number(val);
            }
        });

        try {
            await addProduct.mutateAsync({
                name: formData.name,
                code: formData.code,
                category: formData.category,
                price: Number(formData.price) || 0,
                image_url: formData.image_url,
                dimensions: dimensionsObj,
                is_active: true
            });
            onClose();
            // Reset form
            setFormData({ name: "", code: "", category: "", price: "", image_url: "" });
            setDimensions([
                { key: "length", value: "" },
                { key: "width", value: "" },
                { key: "height", value: "" },
            ]);
        } catch (error) {
            console.error("Failed to add product", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Product Code</Label>
                            <Input
                                id="code"
                                name="code"
                                value={formData.code}
                                onChange={handleInputChange}
                                placeholder="e.g. DWSB-3507"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g. Canis CSP-1013"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (₹)</Label>
                            <Input
                                id="price"
                                name="price"
                                type="number"
                                value={formData.price}
                                onChange={handleInputChange}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="image_url">Image URL</Label>
                        <Input
                            id="image_url"
                            name="image_url"
                            value={formData.image_url}
                            onChange={handleInputChange}
                            placeholder="https://..."
                        />
                    </div>

                    <div className="space-y-4 border p-4 rounded-md bg-gray-50">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-semibold">Dimensions / Specifications</Label>
                            <Button type="button" variant="ghost" size="sm" onClick={addDimensionRow}>
                                <Plus className="h-4 w-4 mr-1" /> Add Field
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {dimensions.map((dim, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <Input
                                        placeholder="Key (e.g. length)"
                                        value={dim.key}
                                        onChange={(e) => handleDimensionChange(index, "key", e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        placeholder="Value (e.g. 685)"
                                        value={dim.value}
                                        onChange={(e) => handleDimensionChange(index, "value", e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500"
                                        onClick={() => removeDimensionRow(index)}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">
                            Values will be automatically saved as numbers if possible.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={addProduct.isPending}>
                            {addProduct.isPending ? "Adding..." : "Add Product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Plus, Trash, Upload } from "lucide-react";
import { ProductUnit } from "@/utils/unitConversions";

interface AddProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit?: any;
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

export const AddProductDialog = ({ isOpen, onClose, productToEdit }: AddProductDialogProps) => {
    const addProduct = useAddProduct();
    const updateProduct = useUpdateProduct();
    const { uploadImage, isUploading } = useImageUpload();

    // Initialize form with productToEdit data if available
    const [formData, setFormData] = useState({
        name: productToEdit?.name || "",
        code: productToEdit?.code || "",
        category: productToEdit?.category || "",
        unit: (productToEdit?.unit as ProductUnit) || "mm",
        price: productToEdit?.price?.toString() || "",
        image_url: productToEdit?.image_url || "",
    });

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(productToEdit?.image_url || "");

    // Initialize dimensions from productToEdit or start with common ones
    const getInitialDimensions = () => {
        if (productToEdit?.dimensions && Object.keys(productToEdit.dimensions).length > 0) {
            return Object.entries(productToEdit.dimensions).map(([key, value]) => ({
                key,
                value: String(value)
            }));
        }
        return [
            { key: "length", value: "" },
            { key: "width", value: "" },
            { key: "height", value: "" },
        ];
    };

    const [dimensions, setDimensions] = useState<{ key: string; value: string }[]>(getInitialDimensions());

    // Update state when productToEdit changes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: productToEdit?.name || "",
                code: productToEdit?.code || "",
                category: productToEdit?.category || "",
                unit: (productToEdit?.unit as ProductUnit) || "mm",
                price: productToEdit?.price?.toString() || "",
                image_url: productToEdit?.image_url || "",
            });
            setImagePreview(productToEdit?.image_url || "");
            setDimensions(getInitialDimensions());
            setSelectedImageFile(null);
        }
    }, [isOpen, productToEdit]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImageFile(file);
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
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
            let finalImageUrl = formData.image_url;

            if (selectedImageFile) {
                const uploadedUrl = await uploadImage(selectedImageFile, 'products', 'product-images');
                if (uploadedUrl) {
                    finalImageUrl = uploadedUrl;
                }
            }

            const productData = {
                name: formData.name,
                code: formData.code,
                category: formData.category,
                unit: formData.unit,
                price: Number(formData.price) || 0,
                image_url: finalImageUrl,
                dimensions: dimensionsObj,
                is_active: true
            };

            if (productToEdit) {
                await updateProduct.mutateAsync({
                    id: productToEdit.id,
                    ...productData
                });
            } else {
                await addProduct.mutateAsync(productData);
            }

            onClose();
            // Reset form
            setFormData({ name: "", code: "", category: "", unit: "mm", price: "", image_url: "" });
            setSelectedImageFile(null);
            setImagePreview("");
            setDimensions([
                { key: "length", value: "" },
                { key: "width", value: "" },
                { key: "height", value: "" },
            ]);
        } catch (error) {
            console.error("Failed to save product", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{productToEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
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
                        <Label htmlFor="unit">Dimensions Unit</Label>
                        <Select
                            value={formData.unit}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, unit: val as ProductUnit }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Unit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mm">Millimeters (mm)</SelectItem>
                                <SelectItem value="cm">Centimeters (cm)</SelectItem>
                                <SelectItem value="in">Inches (in)</SelectItem>
                                <SelectItem value="ft">Feet (ft)</SelectItem>
                                <SelectItem value="m">Meters (m)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label>Product Image</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="product-image-upload"
                                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-16 h-16 object-cover rounded-md"
                                        />
                                    ) : (
                                        <div className="text-center">
                                            <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                            <p className="text-xs text-gray-500">Upload Image</p>
                                        </div>
                                    )}
                                    <input
                                        id="product-image-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageFileChange}
                                    />
                                </label>
                                {imagePreview && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setImagePreview("");
                                            setSelectedImageFile(null);
                                        }}
                                        className="w-full text-xs"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image_url" className="text-xs text-gray-500">Or Image URL</Label>
                                <Input
                                    id="image_url"
                                    name="image_url"
                                    value={formData.image_url}
                                    onChange={handleInputChange}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
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
                        <Button type="submit" disabled={addProduct.isPending || updateProduct.isPending || isUploading}>
                            {isUploading ? "Uploading..." :
                                addProduct.isPending || updateProduct.isPending ? "Saving..." :
                                    productToEdit ? "Update Product" : "Add Product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

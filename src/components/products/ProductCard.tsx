
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndianRupee, Ruler, Box, Info } from "lucide-react";
import { Product } from "@/hooks/useProducts";

interface ProductCardProps {
    product: Product;
    onEdit?: (product: Product) => void;
    onDelete?: (productId: string) => void;
    isAdmin?: boolean;
}

export const ProductCard = ({
    product,
    onEdit,
    onDelete,
    isAdmin = false
}: ProductCardProps) => {

    const renderDimensions = () => {
        if (!product.dimensions || Object.keys(product.dimensions).length === 0) return null;

        return (
            <div className="text-xs text-gray-500 mt-2 space-y-1">
                {Object.entries(product.dimensions).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                        <span className="capitalize">{key.replace('_', ' ')}:</span>
                        <span className="font-medium">
                            {typeof value === 'object'
                                ? JSON.stringify(value).replace(/["{}]/g, '').replace(/:/g, ' ')
                                : value}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col h-full">
            <div
                className="bg-gray-100 h-48 flex items-center justify-center overflow-hidden relative"
            >
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain p-4"
                    />
                ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                        <Box className="h-12 w-12 mb-2" />
                        <span className="text-sm">No Image</span>
                    </div>
                )}
                <Badge className="absolute top-2 right-2" variant="secondary">
                    {product.category}
                </Badge>
            </div>

            <CardContent className="p-4 flex-1 flex flex-col">
                <div className="mb-2">
                    {product.code && (
                        <div className="text-xs text-gray-500 font-mono mb-1">{product.code}</div>
                    )}
                    <h3 className="font-semibold text-gray-800 line-clamp-2" title={product.name}>
                        {product.name}
                    </h3>
                </div>

                <div className="mt-auto space-y-3">
                    <div className="flex items-center text-blue-600 font-bold">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {product.price?.toLocaleString()}
                    </div>

                    <div className="bg-gray-50 p-2 rounded text-sm">
                        <div className="flex items-center gap-1 text-gray-600 mb-1">
                            <Ruler className="h-3 w-3" />
                            <span className="font-medium text-xs">Dimensions</span>
                        </div>
                        {renderDimensions() || <span className="text-xs text-gray-400">N/A</span>}
                    </div>

                    {isAdmin && (
                        <div className="flex gap-2 mt-4 pt-2 border-t border-gray-100">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => onEdit?.(product)}
                            >
                                Edit
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1" // simplistic delete button for now
                                onClick={() => onDelete?.(product.id)}
                            >
                                Delete
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

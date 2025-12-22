
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndianRupee, Ruler, Box, Info, QrCode, Download, RefreshCw, Loader2 } from "lucide-react";
import { Product, useGenerateQRForProduct } from "@/hooks/useProducts";
import { ProductUnit, convertProductDimension, formatProductDimension } from "@/utils/unitConversions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

interface ProductCardProps {
    product: Product;
    onEdit?: (product: Product) => void;
    onDelete?: (productId: string) => void;
    onSelect?: () => void;
    isAdmin?: boolean;
}

export const ProductCard = ({
    product,
    onEdit,
    onDelete,
    onSelect,
    isAdmin = false
}: ProductCardProps) => {
    const [showQRDialog, setShowQRDialog] = useState(false);
    const generateQRMutation = useGenerateQRForProduct();

    const handleDownloadQR = async () => {
        if (!product.qr_code_url) return;
        try {
            const response = await fetch(product.qr_code_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${product.code || 'product'}-qr.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            toast.error("Failed to download QR code");
        }
    };

    const handleRegenerateQR = () => {
        generateQRMutation.mutate(product.id);
    };

    const renderDimensions = () => {
        if (!product.dimensions || Object.keys(product.dimensions).length === 0) return null;

        return (
            <div className="text-xs text-gray-500 mt-2 space-y-1">
                {Object.entries(product.dimensions).map(([key, value]) => {
                    // Try to parse number for conversion
                    const numValue = Number(value);
                    const unit = (product.unit as ProductUnit) || 'mm';
                    const isNumber = !isNaN(numValue) && value !== '';

                    return (
                        <div key={key} className="flex justify-between items-center">
                            <span className="capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-medium flex items-center gap-1">
                                {isNumber
                                    ? formatProductDimension(numValue, unit)
                                    : value}

                                {isNumber && unit !== 'mm' && (
                                    <span className="text-gray-400 text-[10px] ml-1">
                                        ({convertProductDimension(numValue, unit, 'mm').toFixed(1)} mm)
                                    </span>
                                )}
                            </span>
                        </div>
                    );
                })}
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

                    {onSelect ? (
                        <div className="mt-4 pt-2 border-t border-gray-100">
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={onSelect}
                            >
                                Select Product
                            </Button>
                        </div>
                    ) : isAdmin && (
                        <div className="flex gap-2 mt-4 pt-2 border-t border-gray-100">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setShowQRDialog(true)}
                            >
                                <QrCode className="h-4 w-4 mr-1" />
                                QR
                            </Button>
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
            {/* QR Code Dialog */}
            <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Product QR Code</DialogTitle>
                        <DialogDescription>
                            Scan this code to quickly identify the product.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 space-y-4">
                        {product.qr_code_url ? (
                            <div className="bg-white p-4 rounded-lg shadow-sm border">
                                <img
                                    src={product.qr_code_url}
                                    alt={`QR code for ${product.name}`}
                                    className="w-48 h-48 object-contain"
                                />
                            </div>
                        ) : (
                            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                <QrCode className="w-12 h-12" />
                            </div>
                        )}
                        <div className="font-medium text-lg">{product.code}</div>
                        <div className="flex gap-2 w-full">
                            <Button
                                className="flex-1"
                                variant="outline"
                                onClick={handleDownloadQR}
                                disabled={!product.qr_code_url}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                            <Button
                                className="flex-1"
                                variant="outline"
                                onClick={handleRegenerateQR}
                                disabled={generateQRMutation.isPending}
                            >
                                {generateQRMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Regenerate
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

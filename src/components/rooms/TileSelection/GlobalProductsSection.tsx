import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";
import type { CustomerProduct } from "@/hooks/useCustomerProducts";

export const GlobalProductsSection = ({ customerProducts }: { customerProducts: CustomerProduct[] }) => {
  if (customerProducts.length === 0) return null;
  return (
    <Card className="mt-8 border-border bg-muted/20">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Global Selected Products ({customerProducts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customerProducts.map((cp) => (
            <div key={cp.id} className="flex items-center justify-between bg-card p-3 rounded-lg border border-border shadow-sm">
              <div className="flex items-center gap-3">
                {cp.product?.image_url ? (
                  <img src={cp.product.image_url} alt={cp.product.name} className="h-12 w-12 object-cover rounded border" />
                ) : (
                  <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-muted-foreground/70 border border-dashed">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{cp.product?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{cp.product?.code}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">Qty: {cp.quantity}</Badge>
                    <span className="text-xs font-medium text-primary">₹{(cp.quantity * (cp.product?.price || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

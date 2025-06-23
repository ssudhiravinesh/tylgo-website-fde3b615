
import { Card, CardContent } from "@/components/ui/card";
import { IndianRupee } from "lucide-react";

interface QuotationSummaryProps {
  totalCost: number;
  itemCount: number;
}

export const QuotationSummary = ({ totalCost, itemCount }: QuotationSummaryProps) => {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Total Quotation Amount</h3>
            <p className="text-sm text-blue-700">Including all items and calculations</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-2xl font-bold text-blue-900">
              <IndianRupee className="h-6 w-6" />
              {totalCost.toLocaleString()}
            </div>
            <p className="text-sm text-blue-700">{itemCount} item(s)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  User, 
  Calendar, 
  IndianRupee, 
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Home,
  Grid3X3
} from "lucide-react";
import { Quotation } from "@/hooks/useQuotations";
import { format } from "date-fns";

interface QuotationDetailsProps {
  quotation: Quotation;
  onBack: () => void;
}

export const QuotationDetails = ({ quotation, onBack }: QuotationDetailsProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "draft":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Quotation Details
          </h1>
          <p className="text-gray-600">View quotation information</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to List
        </Button>
      </div>

      {/* Quotation Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {quotation.quotation_number}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusIcon(quotation.status)}
              <Badge className={`${getStatusColor(quotation.status)} border`}>
                {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">{quotation.customer?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <span>{quotation.customer?.mobile}</span>
                </div>
              </div>
            </div>

            {/* Quotation Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Quotation Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span>Created: {format(new Date(quotation.created_at), 'PPP')}</span>
                </div>
                {quotation.updated_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span>Updated: {format(new Date(quotation.updated_at), 'PPP')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-gray-400" />
                  <span>Created by: {quotation.worker?.name}</span>
                </div>
              </div>
            </div>

            {/* Total Amount */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Total Amount
              </h3>
              <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
                <IndianRupee className="h-6 w-6" />
                {quotation.total_cost?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms and Tiles Details */}
      {quotation.quotation_items && quotation.quotation_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Rooms & Tiles Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quotation.quotation_items.map((item, index) => (
                <div key={item.id || index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Room Details */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Home className="h-4 w-4 text-blue-600" />
                        Room: {item.room?.name || 'Unknown Room'}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p>Dimensions: {item.room?.length || 0} × {item.room?.width || 0} {item.room?.unit || 'metre'}</p>
                        <p>Area: {item.area} sq ft</p>
                      </div>
                    </div>

                    {/* Tile Details */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4 text-green-600" />
                        Tile: {item.tile?.name || 'Unknown Tile'}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p>Code: {item.tile?.code || 'N/A'}</p>
                        <p>Size: {item.tile?.size_length || 0} × {item.tile?.size_breadth || 0} mm</p>
                        <p>Price per box: ₹{item.tile?.price_per_box?.toLocaleString() || 0}</p>
                        <p>Pieces per box: {item.tile?.pieces_per_box || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Item Total:</span>
                    <span className="font-semibold text-green-600">₹{item.total_price?.toLocaleString() || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Section */}
      {quotation.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium">Created as Draft</span>
              <span className="text-gray-500">
                {format(new Date(quotation.created_at), 'PPP p')}
              </span>
            </div>
            {quotation.status !== 'draft' && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">Status changed to {quotation.status}</span>
                <span className="text-gray-500">
                  {quotation.updated_at ? format(new Date(quotation.updated_at), 'PPP p') : 'Unknown'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

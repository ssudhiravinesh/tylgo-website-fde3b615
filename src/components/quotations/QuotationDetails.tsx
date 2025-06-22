import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, Calendar, IndianRupee, User, Phone, MapPin, Download, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateQuotationPDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";

interface QuotationDetailsProps {
  quotationId: string;
  onBack: () => void;
  onEdit: () => void;
  userRole: "admin" | "worker";
}

interface QuotationItem {
  id: string;
  tile_id: string;
  room_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tile: {
    name: string;
    code: string;
    size_length: number;
    size_breadth: number;
  };
  room: {
    name: string;
  };
}

interface QuotationWithDetails {
  id: string;
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total_cost: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  customer: {
    name: string;
    mobile: string;
    address?: string;
  };
  worker: {
    name: string;
  };
  quotation_items: QuotationItem[];
}

const fetchQuotationDetails = async (quotationId: string): Promise<QuotationWithDetails> => {
  const { data, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(name, mobile, address),
      worker:profiles(name),
      quotation_items(
        id,
        tile_id,
        room_id,
        quantity,
        unit_price,
        total_price,
        tile:tiles(name, code, size_length, size_breadth),
        room:rooms(name)
      )
    `)
    .eq('id', quotationId)
    .single();

  if (error) {
    console.error('Error fetching quotation details:', error);
    throw error;
  }

  return {
    ...data,
    status: data.status as 'draft' | 'sent' | 'approved' | 'rejected'
  };
};

export const QuotationDetails = ({ quotationId, onBack, onEdit, userRole }: QuotationDetailsProps) => {
  const { data: quotation, isLoading, error } = useQuery({
    queryKey: ['quotation-details', quotationId],
    queryFn: () => fetchQuotationDetails(quotationId),
  });

  const handleDownloadPDF = () => {
    if (!quotation) {
      toast.error("Quotation data not available");
      return;
    }

    try {
      generateQuotationPDF(quotation);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Quotation not found</h3>
        <p className="text-gray-500 mb-4">The quotation you're looking for doesn't exist or you don't have permission to view it.</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              {quotation.quotation_number}
            </h1>
            <p className="text-gray-600">Quotation Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`capitalize ${getStatusColor(quotation.status)}`}>
            {quotation.status}
          </Badge>
          <Button onClick={onEdit} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{quotation.customer.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{quotation.customer.mobile}</span>
            </div>
            {quotation.customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{quotation.customer.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotation Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Quotation Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Created: {new Date(quotation.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span>Created by: {quotation.worker.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-green-600">
              <IndianRupee className="h-5 w-5" />
              <span>{quotation.total_cost.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotation Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quotation Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tile</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.quotation_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.tile.name}</div>
                        <div className="text-sm text-gray-500">{item.tile.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.room.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {item.tile.size_length}" × {item.tile.size_breadth}"
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">₹{item.total_price.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-green-600 flex items-center gap-1">
                <IndianRupee className="h-5 w-5" />
                {quotation.total_cost.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quotation.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

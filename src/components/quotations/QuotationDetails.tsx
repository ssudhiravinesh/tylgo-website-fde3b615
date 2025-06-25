import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  User, 
  Calendar, 
  IndianRupee, 
  Download, 
  Mail, 
  Edit, 
  Trash2,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Percent
} from "lucide-react";
import { Quotation } from "@/hooks/useQuotations";
import { usePDFGeneration } from "@/hooks/usePDFGeneration";
import { format } from "date-fns";

interface QuotationDetailsProps {
  quotation: Quotation;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack: () => void;
  userRole?: "admin" | "worker";
}

export const QuotationDetails = ({ quotation, onEdit, onDelete, onBack, userRole }: QuotationDetailsProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [wastagePercentage, setWastagePercentage] = useState<number>(10);
  const { generateQuotationPDF } = usePDFGeneration();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "sent":
        return <Mail className="h-4 w-4 text-blue-600" />;
      case "draft":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 border-green-200";
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateQuotationPDF(quotation, wastagePercentage);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWastageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setWastagePercentage(value);
    }
  };

  const handleSendEmail = () => {
    // TODO: Implement email sending
    console.log("Email sending would happen here");
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
          <p className="text-gray-600">View and manage quotation information</p>
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

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Wastage Percentage Input */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Percent className="h-4 w-4 text-blue-600" />
                <Label htmlFor="pdf-wastage" className="text-sm font-medium">
                  Wastage Percentage for PDF (%)
                </Label>
              </div>
              <Input
                id="pdf-wastage"
                type="number"
                value={wastagePercentage}
                onChange={handleWastageChange}
                min="0"
                step="0.1"
                className="w-32"
                placeholder="Enter wastage"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be applied to calculations in the generated PDF
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isGeneratingPDF ? "Generating..." : "Download PDF"}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSendEmail}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </Button>
              
              {onEdit && (userRole === "admin" || userRole === "worker") && (
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
              
              {onDelete && (userRole === "admin" || userRole === "worker") && (
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History (Placeholder for future enhancement) */}
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

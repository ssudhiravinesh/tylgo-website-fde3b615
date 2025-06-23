
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
  Download, 
  Mail, 
  Edit, 
  Trash2,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Quotation, useDeleteQuotation } from "@/hooks/useQuotations";
import { useQuotationItems } from "@/hooks/useQuotationItems";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateQuotationPDF } from "@/utils/pdfGenerator";
import { sendQuotationEmail } from "@/utils/emailSender";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuotationDetailsProps {
  quotation: Quotation;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack: () => void;
}

export const QuotationDetails = ({ quotation, onEdit, onDelete, onBack }: QuotationDetailsProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const { data: quotationItems = [] } = useQuotationItems(quotation.id);
  const deleteQuotationMutation = useDeleteQuotation();

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
      await generateQuotationPDF(quotation, quotationItems);
      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    if (!quotation.customer?.mobile) {
      toast.error("Customer email not available");
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendQuotationEmail(quotation, quotationItems);
      toast.success("Email sent successfully!");
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteQuotationMutation.mutateAsync(quotation.id);
      toast.success("Quotation deleted successfully!");
      onBack();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast.error("Failed to delete quotation");
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

      {/* Quotation Items */}
      {quotationItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quotation Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quotationItems.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Room</p>
                      <p className="font-semibold">{item.room?.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.room?.length}×{item.room?.width} {item.room?.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tile</p>
                      <p className="font-semibold">{item.tile?.name}</p>
                      <p className="text-xs text-gray-500">{item.tile?.code}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Quantity</p>
                      <p className="font-semibold">{item.quantity} sqm</p>
                      <p className="text-xs text-gray-500">@ ₹{item.unit_price}/sqm</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="font-bold text-green-600 flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />
                        {item.total_price.toLocaleString()}
                      </p>
                    </div>
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

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
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
              disabled={isSendingEmail}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {isSendingEmail ? "Sending..." : "Send Email"}
            </Button>
            
            {onEdit && (
              <Button
                variant="outline"
                onClick={onEdit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the quotation
                    "{quotation.quotation_number}" and all its associated items.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteQuotationMutation.isPending}
                  >
                    {deleteQuotationMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

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

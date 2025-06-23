
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, IndianRupee, User, Download, Eye, Edit, Trash2 } from "lucide-react";
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
import { Quotation } from "@/hooks/useQuotations";

interface QuotationCardProps {
  quotation: Quotation;
  userRole: "admin" | "worker";
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, quotationNumber: string) => void;
  isDeleting: boolean;
}

export const QuotationCard = ({ 
  quotation, 
  userRole, 
  onViewDetails, 
  onEdit, 
  onDelete, 
  isDeleting 
}: QuotationCardProps) => {
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

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {quotation.quotation_number}
          </CardTitle>
          <Badge className={`text-xs capitalize ${getStatusColor(quotation.status)}`}>
            {quotation.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4 text-blue-500" />
          <div>
            <span className="font-medium text-gray-800">{quotation.customer?.name}</span>
            <span className="text-gray-500 ml-2">{quotation.customer?.mobile}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          {new Date(quotation.created_at).toLocaleDateString()}
        </div>
        
        <div className="flex items-center gap-2 text-lg font-bold text-green-600">
          <IndianRupee className="h-5 w-5" />
          {(quotation.total_cost || 0).toLocaleString()}
        </div>
        
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Created by: <span className="font-medium text-gray-700">{quotation.worker?.name}</span>
          </p>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 text-xs"
            onClick={() => onViewDetails(quotation.id)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            <Download className="h-3 w-3 mr-1" />
            PDF
          </Button>
          {userRole === "worker" && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => onEdit(quotation.id)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="flex-1 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete quotation "{quotation.quotation_number}"? 
                      This will permanently remove the quotation and all its associated items from the database. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(quotation.id, quotation.quotation_number)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

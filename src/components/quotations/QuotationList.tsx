import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Calendar, IndianRupee, User, Download, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { useQuotations, useDeleteQuotation } from "@/hooks/useQuotations";
import { QuotationForm } from "./QuotationForm";
import { QuotationDetails } from "./QuotationDetails";
import { QuotationEditForm } from "./QuotationEditForm";
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
import { toast } from "sonner";

interface QuotationListProps {
  userRole: "admin" | "worker";
}

type ViewMode = "list" | "create" | "details" | "edit";

export const QuotationList = ({ userRole }: QuotationListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  
  const { data: quotations = [], isLoading } = useQuotations();
  const deleteQuotationMutation = useDeleteQuotation();
  
  const filteredQuotations = quotations.filter(quotation =>
    quotation.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.customer?.mobile.includes(searchTerm)
  );

  const selectedQuotation = selectedQuotationId 
    ? quotations.find(q => q.id === selectedQuotationId)
    : null;

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

  const handleViewDetails = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setViewMode("details");
  };

  const handleEditQuotation = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setViewMode("edit");
  };

  const handleDeleteQuotation = async (quotationId: string, quotationNumber: string) => {
    try {
      console.log('Deleting quotation from list:', quotationId);
      await deleteQuotationMutation.mutateAsync(quotationId);
      console.log('Quotation deleted successfully from list');
    } catch (error) {
      console.error("Error deleting quotation from list:", error);
      toast.error("Failed to delete quotation");
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedQuotationId(null);
  };

  const handleCreateSuccess = () => {
    setViewMode("list");
  };

  const handleEditSuccess = () => {
    setViewMode("details");
  };

  if (viewMode === "create") {
    return (
      <QuotationForm 
        onBack={handleBackToList}
        onSuccess={handleCreateSuccess}
      />
    );
  }

  if (viewMode === "edit" && selectedQuotation) {
    return (
      <QuotationEditForm
        quotation={selectedQuotation}
        onBack={() => setViewMode("details")}
        onSuccess={handleEditSuccess}
      />
    );
  }

  if (viewMode === "details" && selectedQuotation) {
    return (
      <QuotationDetails
        quotation={selectedQuotation}
        onBack={handleBackToList}
        onEdit={() => handleEditQuotation(selectedQuotation.id)}
        onDelete={() => {
          // Delete functionality is handled within QuotationDetails
          console.log("Delete quotation:", selectedQuotation.id);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ... keep existing code (header section) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
          <p className="text-gray-600">Manage customer quotations and proposals</p>
        </div>
        {userRole === "worker" && (
          <Button 
            onClick={() => setViewMode("create")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Quotation
          </Button>
        )}
      </div>

      {/* ... keep existing code (search section) */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search quotations by customer name, ID, or mobile..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* ... keep existing code (summary cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Quotations</p>
                <p className="text-2xl font-bold">{quotations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold">
                  {quotations.filter(q => q.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">
                  {quotations.filter(q => q.status === 'sent').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <IndianRupee className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">
                  ₹{quotations.reduce((sum, q) => sum + (q.total_cost || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredQuotations.map((quotation) => (
          <Card key={quotation.id} className="hover:shadow-lg transition-shadow duration-200 border-gray-200">
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
                  onClick={() => handleViewDetails(quotation.id)}
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
                      onClick={() => handleEditQuotation(quotation.id)}
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
                            onClick={() => handleDeleteQuotation(quotation.id, quotation.quotation_number)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteQuotationMutation.isPending}
                          >
                            {deleteQuotationMutation.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ... keep existing code (empty state) */}
      {filteredQuotations.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No quotations found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? "Try adjusting your search terms" : "No quotations have been created yet"}
          </p>
          {userRole === "worker" && !searchTerm && (
            <Button 
              onClick={() => setViewMode("create")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Quotation
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

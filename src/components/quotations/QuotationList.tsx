import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Calendar, IndianRupee, User, Plus } from "lucide-react";
import { useQuotations } from "@/hooks/useQuotations";
import { QuotationDetails } from "./QuotationDetails";
import { DeleteQuotationDialog } from "./DeleteQuotationDialog";
import { EditQuotationPage } from "./EditQuotationPage";
import { QuotationActionButtons } from "./QuotationActionButtons";
import { QuotationFilters } from "./QuotationFilters";

interface QuotationListProps {
  userRole: "admin" | "worker";
}

type ViewMode = "list" | "create" | "details" | "edit";

export const QuotationList = ({ userRole }: QuotationListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuotationForAction, setSelectedQuotationForAction] = useState<string | null>(null);
  
  // Date filter states
  const [quickSort, setQuickSort] = useState("all");
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  
  // New filter states
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  const { data: quotations = [], isLoading, refetch, deleteQuotation, isDeleting } = useQuotations({
    quickSort,
    year: filterYear,
    month: filterMonth
  });
  
  const filteredQuotations = quotations.filter(quotation => {
    // Text search filter
    const matchesSearch = quotation.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.customer?.mobile.includes(searchTerm);
    
    // Worker filter
    const matchesWorker = selectedWorker === "all" || quotation.worker_id === selectedWorker;
    
    // Status filter
    const matchesStatus = selectedStatus === "all" || quotation.status === selectedStatus;
    
    return matchesSearch && matchesWorker && matchesStatus;
  });

  const selectedQuotation = selectedQuotationId 
    ? quotations.find(q => q.id === selectedQuotationId)
    : null;

  const selectedQuotationForActionObj = selectedQuotationForAction
    ? quotations.find(q => q.id === selectedQuotationForAction)
    : null;

  // Get unique workers from quotations for filter dropdown
  const uniqueWorkers = quotations.reduce((workers, quotation) => {
    if (quotation.worker && !workers.find(w => w.id === quotation.worker.id)) {
      workers.push({
        id: quotation.worker.id,
        name: quotation.worker.name
      });
    }
    return workers;
  }, [] as Array<{ id: string; name: string }>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewDetails = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setViewMode("details");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedQuotationId(null);
    refetch();
  };

  const handleCreateSuccess = () => {
    setViewMode("list");
    refetch();
  };

  const handleDelete = (quotationId: string) => {
    console.log('Setting up delete for quotation:', quotationId);
    setSelectedQuotationForAction(quotationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedQuotationForAction) {
      console.log('Confirming delete for quotation:', selectedQuotationForAction);
      
      try {
        await deleteQuotation(selectedQuotationForAction);
        console.log('Delete successful, closing dialogs...');
        setDeleteDialogOpen(false);
        setSelectedQuotationForAction(null);
      } catch (error) {
        console.error('Delete failed:', error);
        // Dialog will stay open to show the error and allow retry
      }
    } else {
      console.error('No quotation selected for deletion');
    }
  };

  const handleEdit = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setViewMode("edit");
  };

  const handleEditSuccess = () => {
    refetch(); // Refetch to get updated data
    setViewMode("details"); // Go back to view mode instead of list
  };

  const closeDialogs = () => {
    setDeleteDialogOpen(false);
    setSelectedQuotationForAction(null);
  };

  const handleQuickSortChange = (range: string) => {
    setQuickSort(range);
  };

  const handlePreciseFilterChange = (year: number | null, month: number | null) => {
    setFilterYear(year);
    setFilterMonth(month);
  };

  const handleWorkerFilterChange = (workerId: string) => {
    setSelectedWorker(workerId);
  };

  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
  };

  const clearAllFilters = () => {
    setQuickSort("all");
    setFilterYear(null);
    setFilterMonth(null);
    setSelectedWorker("all");
    setSelectedStatus("all");
    setSearchTerm("");
  };

  if (viewMode === "details" && selectedQuotation) {
    return (
      <QuotationDetails
        quotation={selectedQuotation}
        onBack={handleBackToList}
      />
    );
  }

  if (viewMode === "edit" && selectedQuotation) {
    return (
      <EditQuotationPage
        quotation={selectedQuotation}
        onBack={handleBackToList}
        onSuccess={handleEditSuccess}
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
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
            <p className="text-gray-600">Manage customer quotations and proposals</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search quotations by customer name, ID, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Enhanced Filtering Controls */}
        <QuotationFilters
          onQuickSortChange={handleQuickSortChange}
          onPreciseFilterChange={handlePreciseFilterChange}
          onWorkerFilterChange={handleWorkerFilterChange}
          onStatusFilterChange={handleStatusFilterChange}
          onClearFilters={clearAllFilters}
          currentQuickSort={quickSort}
          currentYear={filterYear}
          currentMonth={filterMonth}
          currentWorker={selectedWorker}
          currentStatus={selectedStatus}
          availableWorkers={uniqueWorkers}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Quotations</p>
                  <p className="text-2xl font-bold">{filteredQuotations.length}</p>
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
                    {filteredQuotations.filter(q => q.status === 'approved').length}
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
                    {filteredQuotations.filter(q => q.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Closed</p>
                <p className="text-2xl font-bold">
                  {filteredQuotations.filter(q => q.status === 'closed').length}
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
                    ₹{filteredQuotations.reduce((sum, q) => sum + (q.total_cost || 0), 0).toLocaleString()}
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
                
                <QuotationActionButtons
                  onView={() => handleViewDetails(quotation.id)}
                  onEdit={() => handleEdit(quotation.id)}
                  onDelete={() => handleDelete(quotation.id)}
                  userRole={userRole}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredQuotations.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No quotations found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedWorker !== "all" || selectedStatus !== "all" ? 
                "Try adjusting your search terms or filters" : 
                "No quotations have been created yet"
              }
            </p>
            {(!searchTerm && selectedWorker === "all" && selectedStatus === "all") ? (
              <Button 
                onClick={() => setViewMode("create")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Quotation
              </Button>
            ) : (
              <Button 
                onClick={clearAllFilters}
                variant="outline"
                className="mr-2"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteQuotationDialog
        isOpen={deleteDialogOpen}
        onClose={closeDialogs}
        onConfirm={handleDeleteConfirm}
        quotationNumber={selectedQuotationForActionObj?.quotation_number || ""}
        isDeleting={isDeleting}
      />

    </>
  );
};

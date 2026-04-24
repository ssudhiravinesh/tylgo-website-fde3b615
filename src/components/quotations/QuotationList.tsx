import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Calendar, IndianRupee, User, Plus, LayoutList, LayoutGrid, MapPin } from "lucide-react";
import { useQuotations } from "@/hooks/useQuotations";
import { QuotationDetails } from "./QuotationDetails";
import { DeleteQuotationDialog } from "./DeleteQuotationDialog";
import { EditQuotationPage } from "./EditQuotationPage";
import { QuotationActionButtons } from "./QuotationActionButtons";
import { QuotationFilters } from "./QuotationFilters";
import { GridLoader } from "@/components/ui/GridLoader";

interface QuotationListProps {
  userRole: "admin" | "worker" | "super_admin";
  showroomId?: string;
}

type ViewMode = "list" | "create" | "details" | "edit";

export const QuotationList = ({ userRole, showroomId }: QuotationListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pageViewMode, setPageViewMode] = useState<ViewMode>("list");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuotationForAction, setSelectedQuotationForAction] = useState<string | null>(null);

  // Date filter states
  const [quickSort, setQuickSort] = useState("all");
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // New filter states
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [areaFilter, setAreaFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  const { data: quotations = [], isLoading, refetch, deleteQuotation, isDeleting } = useQuotations({
    quickSort,
    year: filterYear,
    month: filterMonth,
    overrideShowroomId: showroomId
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

    // Area filter
    const matchesArea = !areaFilter || (quotation.customer as any)?.area?.toLowerCase().includes(areaFilter.toLowerCase());

    // State filter
    const matchesState = stateFilter === "all" || (quotation.customer as any)?.state === stateFilter;

    // Date range filter
    const matchesDateRange = (() => {
      if (!startDate && !endDate) return true;

      const quotationDate = new Date(quotation.created_at);
      const quotationDateOnly = new Date(quotationDate.getFullYear(), quotationDate.getMonth(), quotationDate.getDate());

      if (startDate && endDate) {
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        return quotationDateOnly >= startDateOnly && quotationDateOnly <= endDateOnly;
      }

      if (startDate) {
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        return quotationDateOnly >= startDateOnly;
      }

      if (endDate) {
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        return quotationDateOnly <= endDateOnly;
      }

      return true;
    })();

    return matchesSearch && matchesWorker && matchesStatus && matchesArea && matchesState && matchesDateRange;
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
        return "bg-muted text-foreground";
    }
  };

  const handleViewDetails = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setPageViewMode("details");
  };

  const handleBackToList = () => {
    setPageViewMode("list");
    setSelectedQuotationId(null);
    refetch();
  };

  const handleCreateSuccess = () => {
    setPageViewMode("list");
    refetch();
  };

  const handleDelete = (quotationId: string) => {

    setSelectedQuotationForAction(quotationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedQuotationForAction) {


      try {
        await deleteQuotation(selectedQuotationForAction);

        setDeleteDialogOpen(false);
        setSelectedQuotationForAction(null);
      } catch (error) {

        // Dialog will stay open to show the error and allow retry
      }
    } else {

    }
  };

  const handleEdit = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setPageViewMode("edit");
  };

  const handleEditSuccess = () => {
    refetch(); // Refetch to get updated data
    setPageViewMode("details"); // Go back to view mode instead of list
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

  const handleDateRangeChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const clearAllFilters = () => {
    setQuickSort("all");
    setFilterYear(null);
    setFilterMonth(null);
    setSelectedWorker("all");
    setSelectedStatus("all");
    setAreaFilter("");
    setStateFilter("all");
    setSearchTerm("");
    setStartDate(null);
    setEndDate(null);
  };

  // Helper function to format address
  const formatAddress = (customer: any) => {
    if (!customer) return "-";

    const parts = [];
    if (customer.area) parts.push(customer.area);
    if (customer.state) parts.push(customer.state);

    let formatted = parts.join(", ");
    if (customer.pincode) {
      formatted += formatted ? ` - ${customer.pincode}` : customer.pincode;
    }

    return formatted || "-";
  };

  // Get unique areas and states from customers
  const uniqueAreas = Array.from(new Set(quotations.map(q => (q.customer as any)?.area).filter(Boolean)));
  const uniqueStates = Array.from(new Set(quotations.map(q => (q.customer as any)?.state).filter(Boolean)));

  if (pageViewMode === "details" && selectedQuotation) {
    return (
      <QuotationDetails
        quotation={selectedQuotation}
        onBack={handleBackToList}
      />
    );
  }

  if (pageViewMode === "edit" && selectedQuotation) {
    return (
      <EditQuotationPage
        quotation={selectedQuotation}
        onBack={handleBackToList}
        onSuccess={handleEditSuccess}
      />
    );
  }

  if (isLoading) {
    return <GridLoader loadingText="Loading..." />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quotations</h1>
            <p className="text-muted-foreground">Manage customer quotations and proposals</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  placeholder="Filter by area..."
                  list="area-list"
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="h-10 w-36 px-3 text-sm border border-border rounded-md focus:border-primary focus:ring-primary"
                />
                <datalist id="area-list">
                  {uniqueAreas.map(area => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </div>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="h-10 w-32 px-3 text-sm border border-border rounded-md focus:border-primary focus:ring-primary"
              >
                <option value="all">All States</option>
                {uniqueStates.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}
              >
                <LayoutList className="h-4 w-4" />
                <span className="text-sm">List</span>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${viewMode === 'card'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="text-sm">Card</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search quotations by customer name, ID, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 border-border focus:border-primary focus:ring-primary"
          />
        </div>

        {/* Enhanced Filtering Controls */}
        <QuotationFilters
          onQuickSortChange={handleQuickSortChange}
          onPreciseFilterChange={handlePreciseFilterChange}
          onWorkerFilterChange={handleWorkerFilterChange}
          onStatusFilterChange={handleStatusFilterChange}
          onDateRangeChange={handleDateRangeChange}
          onClearFilters={clearAllFilters}
          currentQuickSort={quickSort}
          currentYear={filterYear}
          currentMonth={filterMonth}
          currentWorker={selectedWorker}
          currentStatus={selectedStatus}
          startDate={startDate}
          endDate={endDate}
          availableWorkers={uniqueWorkers}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Quotations</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Closed</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">
                    ₹{filteredQuotations.reduce((sum, q) => sum + (q.total_cost || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Quotation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{quotation.quotation_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-foreground">{quotation.customer?.name}</div>
                        <div className="text-sm text-muted-foreground">{quotation.customer?.mobile}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground/70" />
                        <div>
                          {formatAddress(quotation.customer)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`text-xs capitalize ${getStatusColor(quotation.status)}`}>
                        {quotation.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₹{(quotation.total_cost || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(quotation.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <QuotationActionButtons
                        onView={() => handleViewDetails(quotation.id)}
                        onEdit={() => handleEdit(quotation.id)}
                        onDelete={() => handleDelete(quotation.id)}
                        userRole={userRole}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredQuotations.map((quotation) => (
              <Card key={quotation.id} className="hover:shadow-lg transition-shadow duration-200 border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {quotation.quotation_number}
                    </CardTitle>
                    <Badge className={`text-xs capitalize ${getStatusColor(quotation.status)}`}>
                      {quotation.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-medium text-foreground">{quotation.customer?.name}</span>
                      <span className="text-muted-foreground ml-2">{quotation.customer?.mobile}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                    <span className="line-clamp-2">
                      {formatAddress(quotation.customer)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground/70" />
                    {new Date(quotation.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                    <IndianRupee className="h-5 w-5" />
                    {(quotation.total_cost || 0).toLocaleString()}
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Created by: <span className="font-medium text-foreground/80">{quotation.worker?.name}</span>
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
        )}

        {filteredQuotations.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No quotations found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedWorker !== "all" || selectedStatus !== "all" || areaFilter || stateFilter !== "all" ?
                "Try adjusting your search terms or filters" :
                "No quotations have been created yet"
              }
            </p>
            {(!searchTerm && selectedWorker === "all" && selectedStatus === "all" && !areaFilter && stateFilter === "all") ? null : (
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

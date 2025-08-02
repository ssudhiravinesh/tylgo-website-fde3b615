import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, FileText, X, MoreHorizontal, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface QuotationFiltersProps {
  onQuickSortChange: (range: string) => void;
  onPreciseFilterChange: (year: number | null, month: number | null) => void;
  onWorkerFilterChange: (workerId: string) => void;
  onStatusFilterChange: (status: string) => void;
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  onClearFilters: () => void;
  currentQuickSort: string;
  currentYear: number | null;
  currentMonth: number | null;
  currentWorker: string;
  currentStatus: string;
  startDate: Date | null;
  endDate: Date | null;
  availableWorkers: Array<{ id: string; name: string }>;
}

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export const QuotationFilters = ({
  onQuickSortChange,
  onPreciseFilterChange,
  onWorkerFilterChange,
  onStatusFilterChange,
  onDateRangeChange,
  onClearFilters,
  currentQuickSort,
  currentYear,
  currentMonth,
  currentWorker,
  currentStatus,
  startDate,
  endDate,
  availableWorkers,
}: QuotationFiltersProps) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const quickSortOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "last_week", label: "Last Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "this_year", label: "This Year" },
  ];

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "approved", label: "Approved" },
    { value: "closed", label: "Closed" },  
  ];

  const hasActiveFilters = currentQuickSort !== "all" || 
                          currentYear !== null || 
                          currentMonth !== null || 
                          currentWorker !== "all" || 
                          currentStatus !== "all" ||
                          startDate !== null ||
                          endDate !== null;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Start Date Picker */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate || undefined}
                onSelect={(date) => onDateRangeChange(date || null, endDate)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Picker */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                {endDate ? format(endDate, "PPP") : <span>End Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate || undefined}
                onSelect={(date) => onDateRangeChange(startDate, date || null)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* More Filters Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className="flex items-center gap-2"
        >
          <MoreHorizontal className="h-4 w-4" />
          More
        </Button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClearFilters}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* More Filters - Hidden by default */}
      {showMoreFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Quick Date Range Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Select value={currentQuickSort} onValueChange={onQuickSortChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {quickSortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Year:</span>
              <Select 
                value={currentYear?.toString() || "all"} 
                onValueChange={(value) => onPreciseFilterChange(value === "all" ? null : parseInt(value), currentMonth)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Month:</span>
              <Select 
                value={currentMonth?.toString() || "all"} 
                onValueChange={(value) => onPreciseFilterChange(currentYear, value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Worker Filter */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <Select value={currentWorker} onValueChange={onWorkerFilterChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select Worker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  {availableWorkers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <Select value={currentStatus} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

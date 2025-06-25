
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Filter, X } from "lucide-react";

interface QuotationFiltersProps {
  onQuickSortChange: (range: string) => void;
  onPreciseFilterChange: (year: number | null, month: number | null) => void;
  currentQuickSort: string;
  currentYear: number | null;
  currentMonth: number | null;
}

const quickSortOptions = [
  { value: "all", label: "All" },
  { value: "current-month", label: "Current Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-2-months", label: "Last 2 Months" },
  { value: "last-year", label: "Last Year" }
];

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
  { value: 12, label: "December" }
];

// Generate years from 2025 to 2035
const years = Array.from({ length: 11 }, (_, i) => 2025 + i);

export const QuotationFilters = ({
  onQuickSortChange,
  onPreciseFilterChange,
  currentQuickSort,
  currentYear,
  currentMonth
}: QuotationFiltersProps) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth);

  const handleQuickSortClick = (range: string) => {
    onQuickSortChange(range);
    // Clear precise filters when quick sort is used
    if (range !== "all") {
      setSelectedYear(null);
      setSelectedMonth(null);
      onPreciseFilterChange(null, null);
    }
  };

  const handlePreciseFilter = () => {
    onPreciseFilterChange(selectedYear, selectedMonth);
    // Clear quick sort when precise filter is used
    if (selectedYear || selectedMonth) {
      onQuickSortChange("all");
    }
  };

  const clearPreciseFilter = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
    onPreciseFilterChange(null, null);
  };

  const hasActiveFilters = currentQuickSort !== "all" || currentYear || currentMonth;

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      {/* Row 1: Quick Sort by Date Range */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {quickSortOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentQuickSort === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickSortClick(option.value)}
              className={`text-xs ${
                currentQuickSort === option.value 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "hover:bg-gray-100"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Row 2: Precise Filter by Year and Month */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Precise Filter:</span>
        </div>
        
        <Select value={selectedYear?.toString() || ""} onValueChange={(value) => setSelectedYear(value ? parseInt(value) : null)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Years</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth?.toString() || ""} onValueChange={(value) => setSelectedMonth(value ? parseInt(value) : null)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Months</SelectItem>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handlePreciseFilter}
          disabled={!selectedYear && !selectedMonth}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>

        {(currentYear || currentMonth) && (
          <Button
            onClick={clearPreciseFilter}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-gray-500">Active filters:</span>
          {currentQuickSort !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {quickSortOptions.find(opt => opt.value === currentQuickSort)?.label}
            </Badge>
          )}
          {currentYear && (
            <Badge variant="secondary" className="text-xs">
              Year: {currentYear}
            </Badge>
          )}
          {currentMonth && (
            <Badge variant="secondary" className="text-xs">
              Month: {months.find(m => m.value === currentMonth)?.label}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

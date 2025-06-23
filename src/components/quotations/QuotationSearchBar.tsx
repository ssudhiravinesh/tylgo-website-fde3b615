
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface QuotationSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const QuotationSearchBar = ({ searchTerm, onSearchChange }: QuotationSearchBarProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Search quotations by customer name, ID, or mobile..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  );
};

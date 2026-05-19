
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const SearchBar = ({ searchTerm, onSearchChange }: SearchBarProps) => {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
      <Input
        placeholder="Search by tile name or code..."
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 h-12 border-border focus:border-primary focus:ring-primary"
      />
    </div>
  );
};

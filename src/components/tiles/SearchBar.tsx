
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, QrCode } from "lucide-react";
import { QRScanner } from "@/components/qr/QRScanner";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onQRScanned: (code: string) => void;
}

export const SearchBar = ({ searchTerm, onSearchChange, onQRScanned }: SearchBarProps) => {
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  const handleQRScanned = (tileCode: string) => {
    onQRScanned(tileCode);
    setIsQRScannerOpen(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by tile name or code..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <Button
          onClick={() => setIsQRScannerOpen(true)}
          className="h-12 gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <QrCode className="h-4 w-4" />
          Scan QR
        </Button>
      </div>

      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScanned}
      />
    </>
  );
};

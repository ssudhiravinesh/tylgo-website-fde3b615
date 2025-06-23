
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuotationListHeaderProps {
  userRole: "admin" | "worker";
  onCreate: () => void;
}

export const QuotationListHeader = ({ userRole, onCreate }: QuotationListHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
        <p className="text-gray-600">Manage customer quotations and proposals</p>
      </div>
      {userRole === "worker" && (
        <Button 
          onClick={onCreate}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Quotation
        </Button>
      )}
    </div>
  );
};

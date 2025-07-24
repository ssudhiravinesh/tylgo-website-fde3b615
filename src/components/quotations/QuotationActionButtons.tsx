
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";

interface QuotationActionButtonsProps {
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  userRole: "admin" | "worker";
}

export const QuotationActionButtons = ({
  onView,
  onEdit,
  onDelete,
  userRole
}: QuotationActionButtonsProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onDelete) {
      onDelete();
    } else {
      
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onEdit) {
      onEdit();
    } else {
      
    }
  };

  return (
    <div className="flex gap-2 pt-2 flex-wrap">
      <Button 
        size="sm" 
        variant="outline" 
        className="text-xs"
        onClick={onView}
      >
        <Eye className="h-3 w-3 mr-1" />
        View
      </Button>
      {/* Both admin and worker can edit and delete */}
      <Button 
        size="sm" 
        className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
        onClick={handleEdit}
      >
        <Edit className="h-3 w-3 mr-1" />
        Edit
      </Button>
      <Button 
        size="sm" 
        variant="destructive" 
        className="text-xs"
        onClick={handleDelete}
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Delete
      </Button>
    </div>
  );
};

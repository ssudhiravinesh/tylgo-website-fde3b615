
import { Button } from "@/components/ui/button";
import { Eye, Download, Mail, Edit, Trash2 } from "lucide-react";

interface QuotationActionButtonsProps {
  onView: () => void;
  onDownload: () => void;
  onSendEmail: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  userRole: "admin" | "worker";
}

export const QuotationActionButtons = ({
  onView,
  onDownload,
  onSendEmail,
  onEdit,
  onDelete,
  userRole
}: QuotationActionButtonsProps) => {
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
      <Button 
        size="sm" 
        variant="outline" 
        className="text-xs"
        onClick={onDownload}
      >
        <Download className="h-3 w-3 mr-1" />
        PDF
      </Button>
      <Button 
        size="sm" 
        variant="outline" 
        className="text-xs"
        onClick={onSendEmail}
      >
        <Mail className="h-3 w-3 mr-1" />
        Email
      </Button>
      {userRole === "worker" && (
        <>
          <Button 
            size="sm" 
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onEdit}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            className="text-xs"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </>
      )}
    </div>
  );
};

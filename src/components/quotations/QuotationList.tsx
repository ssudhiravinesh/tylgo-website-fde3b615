
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Calendar, IndianRupee, User, Download } from "lucide-react";
import { useQuotations } from "@/hooks/useQuotations";

interface QuotationListProps {
  userRole: "admin" | "worker";
}

export const QuotationList = ({ userRole }: QuotationListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: quotations = [], isLoading } = useQuotations();
  
  const filteredQuotations = quotations.filter(quotation =>
    quotation.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.customer?.mobile.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
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
                {quotation.total_cost.toLocaleString()}
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Created by: <span className="font-medium text-gray-700">{quotation.worker?.name}</span>
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  PDF
                </Button>
                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQuotations.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No quotations found</h3>
          <p className="text-gray-500">
            {searchTerm ? "Try adjusting your search terms" : "No quotations have been created yet"}
          </p>
        </div>
      )}
    </div>
  );
};

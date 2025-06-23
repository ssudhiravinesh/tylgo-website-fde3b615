
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  ArrowLeft,
  Edit,
  FileText,
  Home
} from "lucide-react";
import { Customer } from "@/hooks/useCustomers";
import { format } from "date-fns";

interface CustomerDetailsProps {
  customer: Customer;
  onBack: () => void;
  onEdit?: () => void;
  onNewQuote: () => void;
  onManageRooms: () => void;
}

export const CustomerDetails = ({ 
  customer, 
  onBack, 
  onEdit, 
  onNewQuote,
  onManageRooms 
}: CustomerDetailsProps) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customer Details</h1>
            <p className="text-gray-600">View and manage customer information</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          Active Customer
        </Badge>
      </div>

      {/* Customer Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Basic Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium text-gray-800">{customer.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Mobile Number</p>
                      <p className="font-medium text-gray-800">{customer.mobile}</p>
                    </div>
                  </div>
                  
                  {customer.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium text-gray-800">{customer.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Account Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Customer Since</p>
                      <p className="font-medium text-gray-800">
                        {format(new Date(customer.created_at), 'PPP')}
                      </p>
                    </div>
                  </div>
                  
                  {customer.updated_at && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Last Updated</p>
                        <p className="font-medium text-gray-800">
                          {format(new Date(customer.updated_at), 'PPP')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onManageRooms}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Manage Rooms</h3>
                <p className="text-sm text-gray-600">Add and configure customer rooms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onNewQuote}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">New Quotation</h3>
                <p className="text-sm text-gray-600">Create a new quote for this customer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {onEdit && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onEdit}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Edit className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Edit Customer</h3>
                  <p className="text-sm text-gray-600">Update customer information</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onManageRooms} className="gap-2">
              <Home className="h-4 w-4" />
              Manage Rooms & Tiles
            </Button>
            <Button onClick={onNewQuote} className="gap-2 bg-green-600 hover:bg-green-700">
              <FileText className="h-4 w-4" />
              Create New Quote
            </Button>
            {onEdit && (
              <Button variant="outline" onClick={onEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Customer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

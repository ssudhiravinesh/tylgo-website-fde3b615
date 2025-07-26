
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, Calendar, ArrowLeft, Building, Square, Home } from "lucide-react";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import type { Customer } from "@/hooks/useCustomers";
import { decimalFeetToFeetInches } from "@/utils/unitConversions";

interface CustomerDetailsProps {
  customer: Customer;
  onBack: () => void;
}

export const CustomerDetails = ({ customer, onBack }: CustomerDetailsProps) => {
  const { data: rooms = [], isLoading: roomsLoading } = useRoomsByCustomer(customer.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Details</h1>
          <p className="text-gray-600">View complete customer information</p>
        </div>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-lg font-semibold text-gray-800">{customer.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Mobile Number</label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  <p className="text-lg text-gray-800">{customer.mobile}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Customer ID</label>
                <p className="text-sm font-mono text-gray-600">{customer.id.slice(0, 8)}...</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-800">{new Date(customer.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {customer.address && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <label className="text-sm font-medium text-gray-500">Address</label>
              <div className="flex items-start gap-2 mt-2">
                <MapPin className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                <p className="text-gray-800">{customer.address}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rooms Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Rooms ({rooms.length})
            </div>
          
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roomsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No rooms added for this customer yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div key={room.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {room.room_type === 'wall' ? (
                        <Square className="h-4 w-4 text-orange-600" />
                      ) : (
                        <Home className="h-4 w-4 text-blue-600" />
                      )}
                      <h4 className="font-medium text-gray-800">{room.name}</h4>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {room.room_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {room.room_type === 'wall' 
                          ? `${(room.wall_height && room.wall_length ? room.wall_height * room.wall_length : room.length * room.width).toFixed(2)} ${room.unit}²`
                          : `${(room.length * room.width).toFixed(2)} ${room.unit}²`
                        }
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {room.room_type === 'wall' ? (
                      <>
                         {room.wall_height && (
                           <div className="flex justify-between">
                             <span>Height:</span>
                             <span className="font-medium">
                               {room.unit === 'feet' ? decimalFeetToFeetInches(room.wall_height) : `${room.wall_height} ${room.unit}`}
                             </span>
                           </div>
                         )}
                         {room.wall_length && (
                           <div className="flex justify-between">
                             <span>Length:</span>
                             <span className="font-medium">
                               {room.unit === 'feet' ? decimalFeetToFeetInches(room.wall_length) : `${room.wall_length} ${room.unit}`}
                             </span>
                           </div>
                         )}
                         {(!room.wall_height || !room.wall_length) && (
                           <>
                             <div className="flex justify-between">
                               <span>Length:</span>
                               <span className="font-medium">
                                 {room.unit === 'feet' ? decimalFeetToFeetInches(room.length) : `${room.length} ${room.unit}`}
                               </span>
                             </div>
                             <div className="flex justify-between">
                               <span>Width:</span>
                               <span className="font-medium">
                                 {room.unit === 'feet' ? decimalFeetToFeetInches(room.width) : `${room.width} ${room.unit}`}
                               </span>
                             </div>
                           </>
                         )}
                      </>
                    ) : (
                      <>
                         <div className="flex justify-between">
                           <span>Length:</span>
                           <span className="font-medium">
                             {room.unit === 'feet' ? decimalFeetToFeetInches(room.length) : `${room.length} ${room.unit}`}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span>Width:</span>
                           <span className="font-medium">
                             {room.unit === 'feet' ? decimalFeetToFeetInches(room.width) : `${room.width} ${room.unit}`}
                           </span>
                         </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

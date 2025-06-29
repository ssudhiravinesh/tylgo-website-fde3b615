import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Edit, Trash2, Ruler, Calculator, ArrowRight, ArrowLeft, QrCode, Users } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer, useDeleteRoom } from "@/hooks/useRooms";
import { RoomFormDialog } from "./RoomFormDialog";
import { TileSelectionStep } from "./TileSelectionStep";
import { DirectCustomerSearch } from "./DirectCustomerSearch";
import { ContextAwareQRScanner } from "@/components/qr/ContextAwareQRScanner";
import { useQRScanningContext } from "@/contexts/QRScanningContext";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";

interface CustomerRoomManagementProps {
  preSelectedCustomerId?: string | null;
  onBack?: () => void;
}

export const CustomerRoomManagement = ({ preSelectedCustomerId, onBack }: CustomerRoomManagementProps) => {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preSelectedCustomerId || "");
  const { data: rooms = [], isLoading: roomsLoading } = useRoomsByCustomer(selectedCustomerId);
  const deleteRoomMutation = useDeleteRoom();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showTileSelection, setShowTileSelection] = useState(false);
  const [selectedRoomsForQR, setSelectedRoomsForQR] = useState<string[]>([]);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  const { 
    setCurrentCustomer, 
    setSelectedRoomIds, 
    clearContext,
    currentCustomerId,
    selectedRoomIds
  } = useQRScanningContext();

  useEffect(() => {
    if (preSelectedCustomerId) {
      setSelectedCustomerId(preSelectedCustomerId);
    }
  }, [preSelectedCustomerId]);

  useEffect(() => {
    // Update QR scanning context when customer changes
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer) {
      setCurrentCustomer(selectedCustomerId, customer.name);
    } else {
      clearContext();
    }
  }, [selectedCustomerId, customers, setCurrentCustomer, clearContext]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };

  const handleDelete = async (roomId: string, roomName: string) => {
    if (window.confirm(`Are you sure you want to delete "${roomName}"? This action cannot be undone.`)) {
      try {
        await deleteRoomMutation.mutateAsync(roomId);
        toast.success("Room deleted successfully!");
      } catch (error) {
        console.error("Error deleting room:", error);
        toast.error("Failed to delete room");
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  const calculateArea = (room: Room) => {
    return (room.length * room.width).toFixed(2);
  };

  const handleProceedToTileSelection = () => {
    if (rooms.length === 0) {
      toast.error("Please add at least one room before selecting tiles");
      return;
    }
    setShowTileSelection(true);
  };

  const handleBackToRooms = () => {
    setShowTileSelection(false);
  };

  const handleRoomSelectionForQR = (roomId: string) => {
    setSelectedRoomsForQR(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleSelectAllRooms = () => {
    if (selectedRoomsForQR.length === rooms.length) {
      setSelectedRoomsForQR([]);
    } else {
      setSelectedRoomsForQR(rooms.map(room => room.id));
    }
  };

  const handleStartQRScanning = () => {
    if (selectedRoomsForQR.length === 0) {
      toast.error("Please select at least one room for QR scanning");
      return;
    }
    
    setSelectedRoomIds(selectedRoomsForQR);
    setIsQRScannerOpen(true);
    toast.success(`Ready to scan tiles for ${selectedRoomsForQR.length} room(s)`);
  };

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showTileSelection && selectedCustomerId && rooms.length > 0) {
    return (
      <TileSelectionStep
        customerId={selectedCustomerId}
        rooms={rooms}
        onBack={handleBackToRooms}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customer Room Management</h1>
            <p className="text-gray-600">Manage room dimensions for tile calculations</p>
          </div>
        </div>
      </div>

      {/* Customer Search - Always show if no preselected customer */}
      {!preSelectedCustomerId && (
        <div className="w-full">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Home className="h-5 w-5" />
              Select Customer
            </h2>
          </div>
          <DirectCustomerSearch
            value={selectedCustomerId}
            onValueChange={setSelectedCustomerId}
            placeholder="Search customers by name, mobile, or address..."
          />
        </div>
      )}

      {/* Selected Customer Info & Action Buttons */}
      {selectedCustomer && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-blue-50 rounded-lg border">
          <div>
            <h3 className="font-semibold text-gray-800">{selectedCustomer.name}</h3>
            <p className="text-sm text-gray-600">Mobile: {selectedCustomer.mobile}</p>
            {selectedCustomer.address && (
              <p className="text-sm text-gray-600">Address: {selectedCustomer.address}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
            {rooms.length > 0 && (
              <>
                <Button
                  onClick={handleProceedToTileSelection}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  Select Tiles
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleStartQRScanning}
                  disabled={selectedRoomsForQR.length === 0}
                  className="gap-2 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400"
                >
                  <QrCode className="h-4 w-4" />
                  Scan Tiles ({selectedRoomsForQR.length})
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR Room Selection Helper */}
      {selectedCustomerId && rooms.length > 0 && (
        <div className="bg-purple-50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-purple-800 flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Scanning Mode
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAllRooms}
              >
                {selectedRoomsForQR.length === rooms.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-purple-700 mb-3">
            Select rooms where scanned tiles should be assigned:
          </p>
          <div className="flex flex-wrap gap-2">
            {rooms.map(room => (
              <Badge
                key={room.id}
                variant={selectedRoomsForQR.includes(room.id) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedRoomsForQR.includes(room.id) 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'hover:bg-purple-100'
                }`}
                onClick={() => handleRoomSelectionForQR(room.id)}
              >
                {room.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Rooms Display */}
      {selectedCustomerId && (
        <>
          {roomsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No rooms found</h3>
              <p className="text-gray-500 mb-4">Add the first room for this customer</p>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card 
                  key={room.id} 
                  className={`hover:shadow-lg transition-all border-gray-200 ${
                    selectedRoomsForQR.includes(room.id) ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Home className="h-5 w-5 text-blue-600" />
                        {room.name}
                        {selectedRoomsForQR.includes(room.id) && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                            QR Ready
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(room)}
                          className="h-8 w-8 p-0 hover:bg-blue-100"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(room.id, room.name)}
                          className="h-8 w-8 p-0 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">Length:</span>
                      </div>
                      <span className="font-medium">{room.length} {room.unit}</span>
                      
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">Width:</span>
                      </div>
                      <span className="font-medium">{room.width} {room.unit}</span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Calculator className="h-3 w-3 text-green-600" />
                          <span className="text-gray-600">Floor Area:</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          {calculateArea(room)} {room.unit}²
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <RoomFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        room={editingRoom}
        customerId={selectedCustomerId}
      />

      <ContextAwareQRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />
    </div>
  );
};

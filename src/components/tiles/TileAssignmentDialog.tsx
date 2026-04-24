
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface Customer {
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  length: number;
  width: number;
  unit: string;
}

interface TileAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  rooms: Room[];
  selectedCustomerId: string;
  selectedRooms: string[];
  onCustomerChange: (customerId: string) => void;
  onRoomToggle: (roomId: string) => void;
  onSelectAllRooms: () => void;
  onClearSelections: () => void;
  onAssignTile: () => void;
  isAssigning: boolean;
}

export const TileAssignmentDialog = ({
  isOpen,
  onOpenChange,
  customers,
  rooms,
  selectedCustomerId,
  selectedRooms,
  onCustomerChange,
  onRoomToggle,
  onSelectAllRooms,
  onClearSelections,
  onAssignTile,
  isAssigning
}: TileAssignmentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Tile to Customer Rooms
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Customer</label>
            <Select value={selectedCustomerId} onValueChange={onCustomerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCustomerId && rooms.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Select Rooms</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSelectAllRooms}
                    className="h-7 text-xs"
                  >
                    {selectedRooms.length === rooms.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedRooms.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearSelections}
                      className="h-7 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {rooms.map((room) => (
                  <div key={room.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                    <Checkbox
                      id={room.id}
                      checked={selectedRooms.includes(room.id)}
                      onCheckedChange={() => onRoomToggle(room.id)}
                    />
                    <label htmlFor={room.id} className="text-sm flex-1 cursor-pointer">
                      <span className="font-medium">{room.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({(room.length * room.width).toFixed(2)} {room.unit}²)
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedRooms.length} of {rooms.length} rooms selected
              </div>
            </div>
          )}

          {selectedCustomerId && rooms.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No rooms found for this customer. Please add rooms first.
            </p>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button 
              onClick={onAssignTile}
              disabled={!selectedCustomerId || selectedRooms.length === 0 || isAssigning}
              className="flex-1"
            >
              {isAssigning ? 'Assigning...' : 'Assign Tile'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

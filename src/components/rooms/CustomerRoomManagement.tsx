import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridLoader } from "@/components/ui/GridLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Edit, Trash2, Calculator, ArrowRight, ArrowLeft, Footprints, ShoppingBag } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer, useDeleteRoom } from "@/hooks/useRooms";
import { useStaircasesByCustomer, useDeleteStaircase } from "@/hooks/useStaircases";
import { useCustomerProducts, useDeleteCustomerProduct } from "@/hooks/useCustomerProducts";
import { RoomFormDialog } from "./RoomFormDialog";
import { StaircaseFormDialog } from "./StaircaseFormDialog";
import { ProductSelectionDialog } from "@/components/products/ProductSelectionDialog";
import { TileSelectionStep } from "./TileSelectionStep";
import { DirectCustomerSearch } from "./DirectCustomerSearch";
import { DeleteRoomDialog } from "./DeleteRoomDialog";
import { RoomDimensions } from "./RoomDimensions";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Staircase } from "@/hooks/useStaircases";

interface CustomerRoomManagementProps {
  preSelectedCustomerId?: string | null;
  onBack?: () => void;
}

export const CustomerRoomManagement = ({ preSelectedCustomerId, onBack }: CustomerRoomManagementProps) => {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preSelectedCustomerId || "");
  const { data: rooms = [], isLoading: roomsLoading } = useRoomsByCustomer(selectedCustomerId);
  const { data: staircases = [], isLoading: staircasesLoading } = useStaircasesByCustomer(selectedCustomerId);
  const { data: customerProducts = [], isLoading: productsLoading } = useCustomerProducts(selectedCustomerId);

  const deleteRoomMutation = useDeleteRoom();
  const deleteStaircaseMutation = useDeleteStaircase();
  const deleteProductMutation = useDeleteCustomerProduct();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStaircaseFormOpen, setIsStaircaseFormOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingStaircase, setEditingStaircase] = useState<Staircase | null>(null);
  const [showTileSelection, setShowTileSelection] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; room: Room | null }>({
    isOpen: false,
    room: null
  });

  const [deleteStaircaseDialog, setDeleteStaircaseDialog] = useState<{ isOpen: boolean; staircase: Staircase | null }>({
    isOpen: false,
    staircase: null
  });

  useEffect(() => {
    if (preSelectedCustomerId) {
      setSelectedCustomerId(preSelectedCustomerId);
    }
  }, [preSelectedCustomerId]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (room: Room) => {
    setDeleteDialog({ isOpen: true, room });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.room) return;

    try {
      await deleteRoomMutation.mutateAsync(deleteDialog.room.id);
      toast.success("Room deleted successfully!");
      setDeleteDialog({ isOpen: false, room: null });
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Failed to delete room");
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  const handleEditStaircase = (staircase: Staircase) => {
    setEditingStaircase(staircase);
    setIsStaircaseFormOpen(true);
  };

  const handleDeleteStaircaseClick = (staircase: Staircase) => {
    setDeleteStaircaseDialog({ isOpen: true, staircase });
  };

  const handleConfirmDeleteStaircase = async () => {
    if (!deleteStaircaseDialog.staircase) return;

    try {
      await deleteStaircaseMutation.mutateAsync(deleteStaircaseDialog.staircase.id);
      toast.success("Staircase deleted successfully!");
      setDeleteStaircaseDialog({ isOpen: false, staircase: null });
    } catch (error) {
      console.error("Error deleting staircase:", error);
      toast.error("Failed to delete staircase");
    }
  };

  const handleCloseStaircaseForm = () => {
    setIsStaircaseFormOpen(false);
    setEditingStaircase(null);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProductMutation.mutateAsync(id);
    } catch (error) {
      // Handled in mutation hook
    }
  };

  const calculateFloorArea = (room: Room) => {
    if (!room.has_floor) return 0;
    return room.length * room.width;
  };

  const calculateWallArea = (room: Room) => {
    if (!room.has_wall) return 0;
    return (room.wall_height || 0) * (room.wall_length || 0);
  };

  const handleProceedToTileSelection = () => {
    if (rooms.length === 0 && staircases.length === 0 && customerProducts.length === 0) {
      toast.error("Please add at least one room, staircase, or product before selecting tiles");
      return;
    }
    setShowTileSelection(true);
  };

  const handleBackToRooms = () => {
    setShowTileSelection(false);
  };






  if (customersLoading) {
    return <GridLoader loadingText="Loading..." />;
  }

  if (showTileSelection && selectedCustomerId && (rooms.length > 0 || staircases.length > 0 || customerProducts.length > 0)) {
    return (
      <TileSelectionStep
        customerId={selectedCustomerId}
        rooms={rooms}
        staircases={staircases}
        onBack={handleBackToRooms}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Show Back button when:
              1. User came from another section (preSelectedCustomerId set) → onBack goes to that section
              2. User selected a customer in-page (no preSelectedCustomerId but has selectedCustomerId) → clear selection */}
          {(preSelectedCustomerId && onBack) ? (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (!preSelectedCustomerId && selectedCustomerId) ? (
            <Button variant="outline" onClick={() => setSelectedCustomerId("")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : null}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Room Management</h1>
            <p className="text-muted-foreground">Manage room dimensions for tile calculations</p>
          </div>
        </div>
      </div>

      {!preSelectedCustomerId && (
        <div className="w-full">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
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

      {!preSelectedCustomerId && !selectedCustomerId && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-primary/15 rounded-full">
              <Home className="h-4 w-4 text-primary" />
            </div>
            Recent Customers
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customers.slice(0, 5).map((customer) => (
              <Card
                key={customer.id}
                className="content-card cursor-pointer group hover:border-primary/40"
                onClick={() => setSelectedCustomerId(customer.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <span className="text-primary font-semibold text-lg">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary/80 transition-colors">
                          {customer.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">{customer.mobile}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/70 group-hover:text-primary">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {customer.address && (
                    <div className="mt-3 text-xs text-muted-foreground line-clamp-2 bg-muted p-2 rounded">
                      {customer.address}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-muted-foreground/70 flex items-center justify-between">
                    <span>Added {new Date(customer.created_at || "").toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-primary/8 rounded-lg border border-primary/20">
          <div>
            <h3 className="font-semibold text-foreground">{selectedCustomer.name}</h3>
            <p className="text-sm text-muted-foreground">Mobile: {selectedCustomer.mobile}</p>
            {selectedCustomer.address && (
              <p className="text-sm text-muted-foreground">Address: {selectedCustomer.address}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="btn-primary-craft gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
            <Button
              onClick={() => setIsStaircaseFormOpen(true)}
              variant="outline"
              className="gap-2 border-border hover:bg-accent"
            >
              <Footprints className="h-4 w-4" />
              Add Staircase
            </Button>
            <Button
              onClick={() => setIsProductDialogOpen(true)}
              variant="outline"
              className="gap-2 border-border hover:bg-accent"
            >
              <ShoppingBag className="h-4 w-4" />
              Add Product
            </Button>
            {(rooms.length > 0 || staircases.length > 0 || customerProducts.length > 0) && (
              <Button
                onClick={handleProceedToTileSelection}
                className="btn-primary-craft gap-2"
              >
                Select Tiles
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {selectedCustomerId && (
        <>
          {roomsLoading ? (
            <GridLoader loadingText="Loading..." />
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No rooms found</h3>
              <p className="text-muted-foreground mb-4">Add the first room for this customer</p>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="btn-primary-craft gap-2"
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
                  className="content-card"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Home className="h-5 w-5 text-primary" />
                        {room.name}
                        <div className="flex gap-1">
                          {room.has_floor && (
                            <Badge variant="default" className="text-xs">Floor</Badge>
                          )}
                          {room.has_wall && (
                            <Badge variant="secondary" className="text-xs">Wall</Badge>
                          )}
                        </div>
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(room)}
                          className="flex items-center gap-1 px-2 py-1 h-auto hover:bg-primary/15"
                        >
                          <Edit className="h-4 w-4 text-primary" />
                          <span className="text-primary text-sm">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(room)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <RoomDimensions room={room} variant="detailed" />
                    <div className="pt-2 border-t border-border space-y-1">
                      {room.has_floor && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Calculator className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">Floor Area:</span>
                          </div>
                          <Badge variant="outline" className="text-primary border-primary/25 bg-primary/8">
                            {calculateFloorArea(room).toFixed(2)} {room.unit}²
                          </Badge>
                        </div>
                      )}
                      {room.has_wall && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Calculator className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">Wall Area:</span>
                          </div>
                          <Badge variant="outline" className="text-primary border-primary/25 bg-primary/8">
                            {calculateWallArea(room).toFixed(2)} {room.unit}²
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {staircases.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Footprints className="h-5 w-5 text-primary" />
                Staircases ({staircases.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {staircases.map((staircase) => (
                  <Card
                    key={staircase.id}
                    className="content-card border-primary/15 bg-gradient-to-br from-primary/5 to-card"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Footprints className="h-5 w-5 text-primary" />
                          {staircase.name}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStaircase(staircase)}
                            className="flex items-center gap-1 px-2 py-1 h-auto hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4 text-primary" />
                            <span className="text-primary text-sm">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStaircaseClick(staircase)}
                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <p className="text-2xl font-bold text-primary">{staircase.number_of_steps}</p>
                          <p className="text-xs text-muted-foreground">Steps</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold text-foreground">{staircase.number_of_risers}</p>
                          <p className="text-xs text-muted-foreground">Risers</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Calculator className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">Total Tiles Needed:</span>
                          </div>
                          <Badge variant="outline" className="text-primary border-primary/25 bg-primary/8">
                            {staircase.number_of_steps + staircase.number_of_risers} tiles
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {customerProducts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Products ({customerProducts.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {customerProducts.map((cp) => (
                  <Card
                    key={cp.id}
                    className="content-card"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                          {cp.product?.name || 'Unknown Product'}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProduct(cp.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <p className="text-2xl font-bold text-primary">{cp.quantity}</p>
                          <p className="text-xs text-muted-foreground">Quantity</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-xl font-bold text-foreground">₹{cp.product?.price || 0}</p>
                          <p className="text-xs text-muted-foreground">Unit Price</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-semibold text-primary">
                            ₹{(cp.quantity * (cp.product?.price || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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

      <StaircaseFormDialog
        isOpen={isStaircaseFormOpen}
        onClose={handleCloseStaircaseForm}
        staircase={editingStaircase}
        customerId={selectedCustomerId}
      />

      <ProductSelectionDialog
        isOpen={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        customerId={selectedCustomerId}
      />

      <DeleteRoomDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog({ isOpen: open, room: null })}
        onConfirm={handleConfirmDelete}
        roomName={deleteDialog.room?.name || ""}
      />

      <DeleteRoomDialog
        isOpen={deleteStaircaseDialog.isOpen}
        onOpenChange={(open) => setDeleteStaircaseDialog({ isOpen: open, staircase: null })}
        onConfirm={handleConfirmDeleteStaircase}
        roomName={deleteStaircaseDialog.staircase?.name || ""}
      />
    </div>
  );
};

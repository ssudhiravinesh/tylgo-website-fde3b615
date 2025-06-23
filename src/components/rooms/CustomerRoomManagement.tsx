
import { useState } from "react";
import { RoomManagement } from "./RoomManagement";
import { TileSelectionStep } from "./TileSelectionStep";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import { useCustomers } from "@/hooks/useCustomers";

interface CustomerRoomManagementProps {
  customerId: string;
  onBack: () => void;
  onGenerateQuotation: (customerId: string) => void;
}

export const CustomerRoomManagement = ({ 
  customerId, 
  onBack, 
  onGenerateQuotation 
}: CustomerRoomManagementProps) => {
  const [currentStep, setCurrentStep] = useState<"rooms" | "tiles">("rooms");
  const { data: rooms = [], isLoading: roomsLoading } = useRoomsByCustomer(customerId);
  const { data: customers = [] } = useCustomers();
  
  const customer = customers.find(c => c.id === customerId);

  const handleProceedToTileSelection = () => {
    if (rooms.length === 0) {
      return;
    }
    setCurrentStep("tiles");
  };

  const handleBackToRooms = () => {
    setCurrentStep("rooms");
  };

  const handleGenerateQuotation = (customerId: string, calculations: any[]) => {
    onGenerateQuotation(customerId);
  };

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentStep === "tiles") {
    return (
      <TileSelectionStep
        customerId={customerId}
        rooms={rooms}
        onBack={handleBackToRooms}
        onGenerateQuotation={handleGenerateQuotation}
      />
    );
  }

  return (
    <RoomManagement
      customerId={customerId}
      customerName={customer?.name || "Unknown Customer"}
      onBack={onBack}
      onProceedToTileSelection={handleProceedToTileSelection}
    />
  );
};

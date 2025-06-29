
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QRScanningContextType {
  currentCustomerId: string | null;
  currentCustomerName: string | null;
  selectedRoomIds: string[];
  setCurrentCustomer: (customerId: string | null, customerName: string | null) => void;
  setSelectedRoomIds: (roomIds: string[]) => void;
  clearContext: () => void;
  isContextActive: boolean;
}

const QRScanningContext = createContext<QRScanningContextType | undefined>(undefined);

export const QRScanningProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null);
  const [currentCustomerName, setCurrentCustomerName] = useState<string | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  const setCurrentCustomer = (customerId: string | null, customerName: string | null) => {
    setCurrentCustomerId(customerId);
    setCurrentCustomerName(customerName);
    // Clear room selection when customer changes
    if (customerId !== currentCustomerId) {
      setSelectedRoomIds([]);
    }
  };

  const clearContext = () => {
    setCurrentCustomerId(null);
    setCurrentCustomerName(null);
    setSelectedRoomIds([]);
  };

  const isContextActive = Boolean(currentCustomerId && selectedRoomIds.length > 0);

  return (
    <QRScanningContext.Provider
      value={{
        currentCustomerId,
        currentCustomerName,
        selectedRoomIds,
        setCurrentCustomer,
        setSelectedRoomIds,
        clearContext,
        isContextActive,
      }}
    >
      {children}
    </QRScanningContext.Provider>
  );
};

export const useQRScanningContext = () => {
  const context = useContext(QRScanningContext);
  if (context === undefined) {
    throw new Error('useQRScanningContext must be used within a QRScanningProvider');
  }
  return context;
};

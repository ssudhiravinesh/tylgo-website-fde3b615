
import { Toaster } from "@/components/ui/sonner";
import { Toaster as CustomToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { QRScanningProvider } from "@/contexts/QRScanningContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import TileDetails from "./pages/TileDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QRScanningProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <CustomToaster />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/tiles/:tileId" element={<TileDetails />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationProvider>
        </QRScanningProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

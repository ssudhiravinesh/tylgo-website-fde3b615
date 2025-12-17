
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
import LandingPage from "./pages/LandingPage";
import SeedUsers from "./pages/SeedUsers";

const queryClient = new QueryClient();

function App() {
  const hostname = window.location.hostname;
  const searchParams = new URLSearchParams(window.location.search);
  const showroomParam = searchParams.get('showroom');

  // Bouncer Logic:
  // If we are on a "Root" environment (localhost, vercel.app, or main domain)
  // AND we do not have a specific showroom param
  // AND we are on the root path "/"
  // show the Landing Page.
  const isRootContext =
    (hostname.includes('localhost') ||
      hostname.endsWith('.vercel.app') ||
      hostname === 'tylgo.com' ||
      hostname === 'www.tylgo.com');

  if (isRootContext && !showroomParam && window.location.pathname === '/') {
    return <LandingPage />;
  }

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
                  <Route path="/login" element={<Index />} />
                  <Route path="/tiles/:tileId" element={<TileDetails />} />
                  <Route path="/seed-users" element={<SeedUsers />} />
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

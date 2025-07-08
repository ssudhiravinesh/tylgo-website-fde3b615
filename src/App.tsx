
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { QRScanningProvider } from "@/contexts/QRScanningContext";Please choose one (or "q" to quit): 1
Launching lib\main.dart on Windows in debug mode...
lib/main.dart(50,16): error GFFC44FAB: The final variable 'title' must be initialized. [C:\Users\DELL\Videos\my_first\build\windows\x64\flutter\flutter_assemble.vcxproj]
lib/main.dart(54,1): error G85CCD27E: Expected a declaration, but got '}'. [C:\Users\DELL\Videos\my_first\build\windows\x64\flutter\flutter_assemble.vcxproj]
lib/main.dart(53,9): error G5FE39F1E: Type 'MyHomePage' not found. [C:\Users\DELL\Videos\my_first\build\windows\x64\flutter\flutter_assemble.vcxproj]
lib/main.dart(56,38): error G5FE39F1E: Type 'MyHomePage' not found. [C:\Users\DELL\Videos\my_first\build\windows\x64\flutter\flutter_assemble.vcxproj]
lib/main.dart(50,16): error G99FC7582: Field 'title' should be initialized because its type 'String' doesn't allow null. [C:\Users\DELL\Videos\my_first\build\windows\x64\flutter\flutter_assemble.vcxproj]
lib/main.dart(34,13): error GE5CFE876: The method 'WebView' isn't defined for the class 'MyApp'. [C:\Users\DELL\Videos\my_first\build\windows\x64\flutter\flutter_assemble.vcxproj]
lib/main.dart(36,25): error G4127D1E8: The getter 'JavascriptMode' isn't defined for the class 'MyApp'. [C:\Users\DELL\Videos\my_first\build\windows\x64\flutter\flutter_assemble.vcxproj]
C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VC\v170\Microsoft.CppCommon.targets(254,5): error MSB8066: Custom build for 'C:\Users\DELL\Videos\my_first\build\windows\x64\CMakeFiles\aa7375701f6d2316fcce0f4861f56a9b\flutter_windows.dll.rule;C:\Users\DELL\Videos\my_first\build\windows\x64\CMakeFiles\a73d3e09e9f55d669e7125943a16c329\flutter_assemble.rule' exited with code 1. [C:\Users\DELL\Videos\my_first\build\windows\x64\flutter\flutter_assemble.vcxproj]
Building Windows application...               
import Index from "./pages/Index";
import TileDetails from "./pages/TileDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QRScanningProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/tiles/:tileId" element={<TileDetails />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QRScanningProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

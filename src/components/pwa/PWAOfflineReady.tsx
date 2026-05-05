import { useEffect } from "react";
import { Wifi, X } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function PWAOfflineReady() {
  const { isOfflineReady, dismissOfflineReady } = usePWA();

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!isOfflineReady) return;
    const timer = setTimeout(dismissOfflineReady, 5000);
    return () => clearTimeout(timer);
  }, [isOfflineReady, dismissOfflineReady]);

  if (!isOfflineReady) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-300"
      role="status"
      aria-label="App ready for offline use"
    >
      <div
        className="flex items-center gap-3 rounded-2xl border p-4 shadow-2xl"
        style={{
          background: "linear-gradient(135deg, hsl(220, 15%, 13%) 0%, hsl(220, 15%, 18%) 100%)",
          borderColor: "hsl(142, 70%, 45%, 0.2)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div
          className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: "hsl(142, 70%, 45%, 0.1)",
            border: "1px solid hsl(142, 70%, 45%, 0.2)",
          }}
        >
          <Wifi className="h-5 w-5" style={{ color: "hsl(142, 70%, 45%)" }} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="font-manrope text-sm font-semibold"
            style={{ color: "hsl(36, 18%, 97%)" }}
          >
            Ready for Offline
          </p>
          <p
            className="mt-0.5 font-manrope text-xs"
            style={{ color: "hsl(220, 10%, 62%)" }}
          >
            TYLGO has been cached and works offline.
          </p>
        </div>

        <button
          onClick={dismissOfflineReady}
          className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" style={{ color: "hsl(220, 10%, 48%)" }} />
        </button>
      </div>
    </div>
  );
}

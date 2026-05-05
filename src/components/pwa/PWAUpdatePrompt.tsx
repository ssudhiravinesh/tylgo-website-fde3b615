import { RefreshCw, X } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function PWAUpdatePrompt() {
  const { isUpdateAvailable, update, dismissUpdate } = usePWA();

  if (!isUpdateAvailable) return null;

  return (
    <div
      className="fixed top-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-top-4 duration-300"
      role="alert"
      aria-label="App update available"
    >
      <div
        className="relative overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: "linear-gradient(135deg, hsl(220, 15%, 13%) 0%, hsl(220, 15%, 18%) 100%)",
          borderColor: "hsl(36, 90%, 50%, 0.2)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(217, 119, 6, 0.08)",
        }}
      >
        {/* Top glow */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(36, 90%, 50%, 0.5), transparent)",
          }}
        />

        <div className="flex items-center gap-3 p-4">
          {/* Icon */}
          <div
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, hsl(36, 90%, 50%, 0.15), hsl(36, 90%, 50%, 0.05))",
              border: "1px solid hsl(36, 90%, 50%, 0.2)",
            }}
          >
            <RefreshCw
              className="h-5 w-5 animate-spin"
              style={{
                color: "hsl(36, 90%, 50%)",
                animationDuration: "3s",
              }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className="font-manrope text-sm font-semibold"
              style={{ color: "hsl(36, 18%, 97%)" }}
            >
              Update Available
            </p>
            <p
              className="mt-0.5 font-manrope text-xs"
              style={{ color: "hsl(220, 10%, 62%)" }}
            >
              A new version of TYLGO is ready.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={update}
              className="rounded-lg px-3 py-1.5 font-manrope text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, hsl(36, 90%, 50%) 0%, hsl(36, 85%, 45%) 100%)",
                color: "hsl(220, 15%, 13%)",
                boxShadow: "0 2px 12px rgba(217, 119, 6, 0.3)",
              }}
            >
              Refresh
            </button>
            <button
              onClick={dismissUpdate}
              className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/5"
              aria-label="Dismiss update notification"
            >
              <X className="h-4 w-4" style={{ color: "hsl(220, 10%, 48%)" }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

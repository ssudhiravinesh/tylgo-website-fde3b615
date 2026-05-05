import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

const DISMISS_KEY = "tylgo-pwa-install-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAInstallPrompt() {
  const { isInstallable, install } = usePWA();
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    if (!isInstallable) return;

    // Check if the user dismissed the prompt recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) return;
    }

    // Show after a short delay (let the page load first)
    const timer = setTimeout(() => setVisible(true), 3000);

    // Auto-hide after 30 seconds
    const autoHide = setTimeout(() => handleDismiss(), 33000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHide);
    };
  }, [isInstallable]);

  const handleDismiss = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setVisible(false);
      setAnimateOut(false);
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }, 300);
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      handleDismiss();
    }
  };

  if (!visible || !isInstallable) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:max-w-sm
        transition-all duration-300 ease-out
        ${animateOut ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}
      `}
      role="alert"
      aria-label="Install TYLGO app"
    >
      <div
        className="relative overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: "linear-gradient(135deg, hsl(220, 15%, 13%) 0%, hsl(220, 15%, 18%) 100%)",
          borderColor: "hsl(36, 90%, 50%, 0.2)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(217, 119, 6, 0.08)",
        }}
      >
        {/* Subtle amber glow at top */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(36, 90%, 50%, 0.5), transparent)",
          }}
        />

        <div className="flex items-start gap-4 p-4">
          {/* Logo */}
          <div
            className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, hsl(36, 90%, 50%, 0.15), hsl(36, 90%, 50%, 0.05))",
              border: "1px solid hsl(36, 90%, 50%, 0.2)",
            }}
          >
            <img
              src="/tylgo-logo.png"
              alt="TYLGO"
              className="h-8 w-8 object-contain"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className="font-manrope text-sm font-semibold"
              style={{ color: "hsl(36, 18%, 97%)" }}
            >
              Install TYLGO
            </p>
            <p
              className="mt-0.5 font-manrope text-xs leading-relaxed"
              style={{ color: "hsl(220, 10%, 62%)" }}
            >
              Add to your home screen for quick access and an app-like experience.
            </p>

            {/* Install Button */}
            <button
              onClick={handleInstall}
              className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-manrope text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, hsl(36, 90%, 50%) 0%, hsl(36, 85%, 45%) 100%)",
                color: "hsl(220, 15%, 13%)",
                boxShadow: "0 2px 12px rgba(217, 119, 6, 0.3)",
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Install App
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/5"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" style={{ color: "hsl(220, 10%, 48%)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

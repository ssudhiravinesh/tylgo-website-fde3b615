import { useState, useEffect, useCallback } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Hook that manages the entire PWA lifecycle:
 * - Install prompt (beforeinstallprompt event)
 * - Installation tracking
 * - Service worker update detection & application
 */
export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Register service worker via vite-plugin-pwa
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 60 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
      console.log("[PWA] Service worker registered:", swUrl);
    },
    onRegisterError(error) {
      console.error("[PWA] Service worker registration error:", error);
    },
  });

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log("[PWA] App installed successfully");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // Trigger the native install prompt
  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error("[PWA] Install prompt error:", error);
      return false;
    }
  }, [deferredPrompt]);

  // Apply the pending service worker update
  const update = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  // Dismiss the update prompt
  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  // Dismiss the offline ready notification
  const dismissOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, [setOfflineReady]);

  return {
    /** Whether the app can be installed (prompt available) */
    isInstallable: !!deferredPrompt && !isInstalled,
    /** Whether the app is running in standalone/installed mode */
    isInstalled,
    /** Whether a new version is available */
    isUpdateAvailable: needRefresh,
    /** Whether the app is ready for offline use */
    isOfflineReady: offlineReady,
    /** Trigger the native install prompt */
    install,
    /** Apply the pending service worker update (reloads page) */
    update,
    /** Dismiss the update notification */
    dismissUpdate,
    /** Dismiss the offline ready notification */
    dismissOfflineReady,
  };
}

// src/components/tiles/TallyStockSyncButton.tsx
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useTriggerStockSync, useLastStockSync } from "@/hooks/useTallySync";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSessionInfo } from "@/utils/sessionCache";

/**
 * "Sync with Tally" button + last-synced timestamp.
 * Self-contained — drop it anywhere in the tile views.
 *
 * Flow:
 *  1. User clicks → inserts pending stock_pull into tally_sync_log
 *  2. Button enters "syncing" state, polls the log entry every 3s
 *  3. When relay fulfills the request (status → success/failure), shows result
 *  4. On success, invalidates tile cache so new quantities appear
 */
export const TallyStockSyncButton = () => {
  const triggerSync = useTriggerStockSync();
  const { data: lastSync } = useLastStockSync();
  const queryClient = useQueryClient();

  const [syncLogId, setSyncLogId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<"success" | "failure" | null>(null);

  // Poll for sync completion
  useEffect(() => {
    if (!syncLogId || !isSyncing) return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("tally_sync_log")
        .select("status, records_processed, error_message")
        .eq("id", syncLogId)
        .single();

      if (error || !data) return;

      if (data.status === "success") {
        clearInterval(interval);
        setIsSyncing(false);
        setSyncResult("success");
        // Invalidate tile queries so new stock quantities appear
        queryClient.invalidateQueries({ queryKey: ["tiles"] });
        queryClient.invalidateQueries({ queryKey: ["tile-categories"] });
        queryClient.invalidateQueries({ queryKey: ["last-stock-sync"] });
        toast.success(
          `Stock synced — ${data.records_processed} tile${data.records_processed === 1 ? "" : "s"} updated`
        );
        // Auto-clear success badge after 5s
        setTimeout(() => setSyncResult(null), 5000);
      } else if (data.status === "failure") {
        clearInterval(interval);
        setIsSyncing(false);
        setSyncResult("failure");
        toast.error(data.error_message || "Stock sync failed");
        setTimeout(() => setSyncResult(null), 8000);
      }
      // else still 'pending' — keep polling
    }, 3000);

    // Timeout after 60 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (isSyncing) {
        setIsSyncing(false);
        setSyncResult("failure");
        toast.error("Stock sync timed out — is the relay running?");
        setTimeout(() => setSyncResult(null), 8000);
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [syncLogId, isSyncing, queryClient]);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;

    try {
      setSyncResult(null);
      setIsSyncing(true);

      const session = await getSessionInfo();
      const brandId = session.brandId;

      if (!brandId) {
        toast.error("Could not determine brand — please try again");
        setIsSyncing(false);
        return;
      }

      const result = await triggerSync.mutateAsync(brandId);
      setSyncLogId(result.id);
    } catch {
      setIsSyncing(false);
      setSyncResult("failure");
      setTimeout(() => setSyncResult(null), 5000);
    }
  }, [isSyncing, triggerSync]);

  // Format relative time
  const formatLastSync = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Last synced timestamp */}
      {lastSync && lastSync.status === "success" && !isSyncing && !syncResult && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Synced {formatLastSync(lastSync.created_at)}</span>
        </div>
      )}

      {/* Success badge */}
      {syncResult === "success" && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 text-xs">
          <CheckCircle2 className="h-3 w-3" />
          Synced
        </Badge>
      )}

      {/* Failure badge */}
      {syncResult === "failure" && (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 text-xs">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      )}

      {/* Sync button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">
          {isSyncing ? "Syncing..." : "Sync Stock"}
        </span>
      </Button>
    </div>
  );
};

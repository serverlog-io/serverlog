import { useState, useEffect, useCallback, useRef } from "react";
import EventApi from "@/api/event.api";
import { useSocket } from "@/hooks/useSocket";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function OnlineUsersIndicator({ projectId }) {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  const fetchOnlineUsers = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data } = await EventApi.getOnlineUsers(projectId);
      setCount(data.count);
    } catch (err) {
      console.error("Failed to fetch online users:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchOnlineUsers();
    // Refresh every 60 seconds to sync with server
    const interval = setInterval(fetchOnlineUsers, 60000);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  // Handle new events from WebSocket - refetch count when event has userId
  const handleNewEvent = useCallback((event) => {
    if (event.userId) {
      // Debounce to avoid too many requests if multiple events come in quickly
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchOnlineUsers();
      }, 500);
    }
  }, [fetchOnlineUsers]);

  // Connect to WebSocket for real-time updates
  useSocket(projectId, handleNewEvent);

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/20" />
        <span className="text-sm text-white/30">...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
            <div className="relative flex h-2.5 w-2.5">
              {count > 0 && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${count > 0 ? 'bg-emerald-500' : 'bg-white/20'}`} />
            </div>
            <span className="text-sm text-white/60">
              <span className="font-semibold text-white">{count}</span> online
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Unique users active in the last 30 minutes</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

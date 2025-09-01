import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Key, 
  TrendingUp, 
  AlertCircle,
  RefreshCw
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettingsStore } from "@/store/settingsStore";
import { apiKeyService } from "@/services/apiKeyService";

interface CostTrackerProps {
  compact?: boolean;
}

export function CostTracker({ compact = false }: CostTrackerProps) {
  const { dreamsRouterApiKey } = useSettingsStore();
  const [requestCount, setRequestCount] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check API key on mount and when it changes
  useEffect(() => {
    const checkApiKey = () => {
      const configured = apiKeyService.isConfigured();
      setHasApiKey(configured);
    };
    
    checkApiKey();
    // Check periodically in case it changes
    const interval = setInterval(checkApiKey, 5000);
    
    return () => clearInterval(interval);
  }, [dreamsRouterApiKey]);

  // Track request count from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("dreams_router_request_count");
    if (stored) {
      setRequestCount(parseInt(stored, 10));
    }
  }, []);

  const incrementRequestCount = () => {
    const newCount = requestCount + 1;
    setRequestCount(newCount);
    localStorage.setItem("dreams_router_request_count", newCount.toString());
  };

  // Subscribe to agent events to track requests
  useEffect(() => {
    const handleAgentRequest = () => {
      incrementRequestCount();
    };

    // Listen for custom event from agent
    window.addEventListener("dreams_router_request_sent", handleAgentRequest);
    
    return () => {
      window.removeEventListener("dreams_router_request_sent", handleAgentRequest);
    };
  }, [requestCount]);

  // Show tracker if we have API key configured
  if (!hasApiKey) {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary"
                className="cursor-pointer"
              >
                <Key className="h-3 w-3 mr-1" />
                Dreams Router
              </Badge>
              <Badge variant="outline" className="text-xs">
                {requestCount} requests
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Auth mode:</span>
                <span className="font-medium">API Key</span>
              </div>
              <div className="flex justify-between">
                <span>Requests today:</span>
                <span className="font-medium">{requestCount}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Dreams Router</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">API Key</span>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Usage Today</span>
        </div>
        <div className="space-y-1">
          <span className="text-lg font-semibold">{requestCount} requests</span>
          <span className="text-xs text-muted-foreground block">
            Dreams Router API
          </span>
        </div>
      </div>
    </div>
  );
}
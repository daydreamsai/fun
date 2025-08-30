import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettingsStore } from "@/store/settingsStore";
import { x402Service } from "@/services/x402Service";
import { walletJWTService } from "@/services/walletJWTService";
import { toast } from "sonner";

interface CostTrackerProps {
  compact?: boolean;
}

export function CostTracker({ compact = false }: CostTrackerProps) {
  const { x402WalletKey, x402Amount, x402Network } = useSettingsStore();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [hasWalletJWT, setHasWalletJWT] = useState(false);

  // Check balance on mount and when wallet changes
  useEffect(() => {
    if (x402WalletKey) {
      checkBalance();
    }
  }, [x402WalletKey, x402Network]);

  // Check for JWT from connected wallet
  useEffect(() => {
    const checkJWT = () => {
      const hasJWT = walletJWTService.isAuthenticated();
      setHasWalletJWT(hasJWT);
    };
    
    checkJWT();
    // Check periodically
    const interval = setInterval(checkJWT, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Track request count from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("x402_request_count");
    if (stored) {
      setRequestCount(parseInt(stored, 10));
    }
  }, []);

  const checkBalance = async () => {
    setIsLoading(true);
    try {
      await x402Service.initialize();
      const { formatted } = await x402Service.getUSDCBalance();
      setBalance(formatted);
      
      // Check if balance is low
      const balanceNum = parseFloat(formatted);
      if (balanceNum < 5) {
        toast.warning(`Low balance: ${formatted} USDC. Consider topping up soon.`);
      }
    } catch (error) {
      console.error("Failed to check balance:", error);
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

  const incrementRequestCount = () => {
    const newCount = requestCount + 1;
    setRequestCount(newCount);
    localStorage.setItem("x402_request_count", newCount.toString());
  };

  // Subscribe to agent events to track requests
  useEffect(() => {
    const handleAgentRequest = () => {
      incrementRequestCount();
      // Refresh balance every 10 requests
      if ((requestCount + 1) % 10 === 0) {
        checkBalance();
      }
    };

    // Listen for custom event from agent
    window.addEventListener("x402_request_sent", handleAgentRequest);
    
    return () => {
      window.removeEventListener("x402_request_sent", handleAgentRequest);
    };
  }, [requestCount]);

  const costPerRequest = parseFloat(x402Amount) / 1000000;
  const estimatedSpent = requestCount * costPerRequest;
  const remainingRequests = balance ? Math.floor(parseFloat(balance) / costPerRequest) : 0;

  const getFaucetUrl = () => {
    if (x402Network === "base-sepolia") {
      return "https://faucet.circle.com/";
    }
    return "https://app.uniswap.org/";
  };

  // Show tracker if we have either JWT or private key
  if (!x402WalletKey && !hasWalletJWT) {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge 
                variant={balance && parseFloat(balance) < 5 ? "destructive" : "secondary"}
                className="cursor-pointer"
                onClick={checkBalance}
              >
                <DollarSign className="h-3 w-3 mr-1" />
                {isLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : balance ? (
                  `${balance} USDC`
                ) : (
                  "Check Balance"
                )}
              </Badge>
              {hasWalletJWT && (
                <Badge variant="outline" className="text-xs">
                  JWT
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Auth mode:</span>
                <span className="font-medium">{hasWalletJWT ? "Abstract Wallet" : "Private Key"}</span>
              </div>
              <div className="flex justify-between">
                <span>Requests today:</span>
                <span className="font-medium">{requestCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Est. spent:</span>
                <span className="font-medium">${estimatedSpent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-medium">~{remainingRequests} requests</span>
              </div>
              {balance && parseFloat(balance) < 5 && (
                <div className="pt-2 border-t">
                  <Button
                    size="sm"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => window.open(getFaucetUrl(), "_blank")}
                  >
                    Top up USDC <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
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
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">x402 Balance</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">
            {isLoading ? "..." : balance ? `${balance} USDC` : "—"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={checkBalance}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
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
            ~${estimatedSpent.toFixed(2)} spent
          </span>
        </div>
      </div>

      {balance && parseFloat(balance) < 5 && (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <div className="text-sm">
            <p className="font-medium">Low balance</p>
            <Button
              size="sm"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => window.open(getFaucetUrl(), "_blank")}
            >
              Get USDC <ExternalLink className="h-3 w-3 ml-1 inline" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  Loader2,
  DollarSign
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { x402Service } from "@/services/x402Service";
import { generatePrivateKey } from "viem/accounts";
import { toast } from "sonner";

export function WalletSetup() {
  const { x402WalletKey, setX402WalletKey, x402Network } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [balance, setBalance] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet is configured on mount
  useEffect(() => {
    if (!x402WalletKey) {
      setOpen(true);
    } else {
      checkBalance();
    }
  }, [x402WalletKey]);

  const checkBalance = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await x402Service.initialize();
      const addr = x402Service.getAddress();
      setAddress(addr);
      
      const { formatted } = await x402Service.getUSDCBalance();
      setBalance(formatted);
      
      if (parseFloat(formatted) < 10) {
        setError(`Low balance: ${formatted} USDC. Minimum 10 USDC recommended.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check balance");
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewWallet = () => {
    const newKey = generatePrivateKey();
    setPrivateKey(newKey);
    toast.success("New wallet generated! Save your private key securely.");
  };

  const importWallet = async () => {
    if (!privateKey || !privateKey.startsWith("0x")) {
      setError("Invalid private key. Must start with 0x");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save the key
      setX402WalletKey(privateKey);
      
      // Initialize and check balance
      await x402Service.initialize();
      const addr = x402Service.getAddress();
      setAddress(addr);
      
      const { formatted } = await x402Service.getUSDCBalance();
      setBalance(formatted);
      
      if (parseFloat(formatted) < 10) {
        toast.warning(`Wallet imported but has low balance: ${formatted} USDC`);
        setError(`You need at least 10 USDC to start. Current: ${formatted} USDC`);
      } else {
        toast.success("Wallet imported successfully!");
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import wallet");
      toast.error("Failed to import wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getFaucetUrl = () => {
    if (x402Network === "base-sepolia") {
      return "https://faucet.circle.com/";
    }
    return "https://app.uniswap.org/";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            x402 Wallet Setup
          </DialogTitle>
          <DialogDescription>
            Configure your wallet for USDC micropayments. Each AI request costs approximately $0.10 USDC.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import Wallet</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="privateKey">Private Key</Label>
              <div className="flex gap-2">
                <Input
                  id="privateKey"
                  type="password"
                  placeholder="0x..."
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="font-mono"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Your private key is stored locally and never sent to any server.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Generate a new wallet for x402 payments. Save your private key securely - it cannot be recovered!
              </AlertDescription>
            </Alert>

            {privateKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <Label>Your Private Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs break-all">{privateKey}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(privateKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <AlertDescription>
                    Save this private key immediately! You will need USDC on {x402Network} to use the service.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Button onClick={generateNewWallet} className="w-full">
                Generate New Wallet
              </Button>
            )}
          </TabsContent>
        </Tabs>

        {address && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Wallet Address</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(address)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <code className="text-xs text-muted-foreground break-all">{address}</code>
          </div>
        )}

        {balance !== null && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Balance:</span>
            </div>
            <Badge variant={parseFloat(balance) < 10 ? "destructive" : "default"}>
              {balance} USDC
            </Badge>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {balance !== null && parseFloat(balance) < 10 && (
            <Button
              variant="outline"
              onClick={() => window.open(getFaucetUrl(), "_blank")}
              className="gap-2"
            >
              Get USDC <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            onClick={importWallet}
            disabled={!privateKey || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : balance !== null && parseFloat(balance) >= 10 ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Continue
              </>
            ) : (
              "Import Wallet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
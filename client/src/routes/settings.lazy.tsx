import { createLazyFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSettingsStore,
  VALID_MODELS,
  clearUserSettings,
  UserSettings,
} from "@/store/settingsStore";
import { Eye, EyeOff, Wallet, DollarSign, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { x402Service } from "@/services/x402Service";
import { toast } from "sonner";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfile } from "@/components/UserProfile";
import { AbstractWalletConnect } from "@/components/AbstractWalletConnect";
import { walletJWTService } from "@/services/walletJWTService";

export const Route = createLazyFileRoute("/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const API_BASE = "https://gigaverse.io/api";
  // Use the Zustand store directly
  const settings = useSettingsStore();
  const { login, logout } = useLoginWithAbstract();
  const { address, status } = useAccount();
  const { data: abstractClient } = useAbstractClient();

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [_gigaTokenStatus, setGigaTokenStatus] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({
    x402WalletKey: false,
    gigaverseToken: false,
  });
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [hasWalletJWT, setHasWalletJWT] = useState(false);

  // Check if token exists on mount and when token changes
  useEffect(() => {
    if (settings.gigaverseToken) {
      setGigaTokenStatus("success");
    } else {
      setGigaTokenStatus(null);
    }
  }, [settings.gigaverseToken]);

  // Check wallet balance when wallet key changes
  useEffect(() => {
    if (settings.x402WalletKey) {
      checkWalletBalance();
    }
  }, [settings.x402WalletKey]);

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

  const checkWalletBalance = async () => {
    setIsCheckingBalance(true);
    try {
      await x402Service.initialize();
      const addr = x402Service.getAddress();
      setWalletAddress(addr);
      
      const { formatted } = await x402Service.getUSDCBalance();
      setWalletBalance(formatted);
    } catch (error) {
      console.error("Failed to check balance:", error);
      setWalletBalance(null);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getFaucetUrl = () => {
    if (settings.x402Network === "base-sepolia") {
      return "https://faucet.circle.com/";
    }
    return "https://app.uniswap.org/";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;

    // Only pass valid UserSettings keys
    if (
      name === "x402WalletKey" ||
      name === "gigaverseToken" ||
      name === "model"
    ) {
      settings.setApiKey(name as keyof UserSettings, e.target.value);
    } else {
      const value =
        e.target.type === "number" ? e.target.valueAsNumber : e.target.value;
      console.log({ value });
      useSettingsStore.setState({
        [name]: value,
      });
    }
  };

  const handleModelChange = (value: string) => {
    settings.setModel(value as (typeof VALID_MODELS)[number]);
  };

  const toggleVisibility = (field: string) => {
    setVisibleFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSaveSettings = () => {
    // With Zustand persist, settings are automatically saved
    // This function is kept for UI feedback
    setSaveStatus(
      "Settings saved successfully! Agent will be recreated with new settings."
    );
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleClearSettings = () => {
    clearUserSettings();
    setSaveStatus("Settings cleared successfully!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  async function fetchGigaToken() {
    try {
      const payload = await signLogin(Date.now());
      const response = await fetch(`${API_BASE}/user/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const value = await handleResponse(response);
      settings.setApiKey("gigaverseToken", value.jwt);
      settings.setAbstractAddress(payload.address ?? "");
      setSaveStatus("Gigaverse token obtained successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Error fetching token:", error);
      setSaveStatus("Failed to obtain Gigaverse token. Please try again.");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }

  async function handleResponse(response: Response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Request failed with status ${response.status}: ${errorText}`
      );
    }
    return response.json();
  }

  async function signLogin(timestamp: number) {
    const message = `Login to Gigaverse at ${timestamp}`;
    const signature = await abstractClient!.signMessage({ message });
    return { address: address, message, signature, timestamp };
  }

  return (
    <div className="overflow-y-scroll pb-[20dvh]">
      <div className="container mx-auto py-10 px-4 max-w-3xl">
        <Tabs defaultValue="x402" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="x402">x402 Payments</TabsTrigger>
            <TabsTrigger value="api-keys">API Settings</TabsTrigger>
            <TabsTrigger value="profile">User Profile</TabsTrigger>
          </TabsList>
          <TabsContent value="x402">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  x402 Micropayments
                </CardTitle>
                <CardDescription>
                  Configure your wallet for USDC micropayments. Each AI request costs approximately {(parseInt(settings.x402Amount) / 1000000).toFixed(2)} USDC.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wallet Connection Section */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Wallet Authentication</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Connect with Abstract wallet or use private key
                      </p>
                    </div>
                    <AbstractWalletConnect />
                  </div>
                  
                  {hasWalletJWT && (
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600 dark:text-green-400">
                        Authenticated with Abstract wallet. JWT active.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Only show private key option if no wallet JWT */}
                {!hasWalletJWT && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or use private key
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="x402WalletKey">Wallet Private Key</Label>
                  <div className="flex relative">
                    <Input
                      id="x402WalletKey"
                      name="x402WalletKey"
                      type={visibleFields.x402WalletKey ? "text" : "password"}
                      value={settings.x402WalletKey}
                      onChange={(e) => settings.setX402WalletKey(e.target.value)}
                      placeholder="0x..."
                      className="pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility("x402WalletKey")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {visibleFields.x402WalletKey ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                      <p className="text-sm text-muted-foreground">
                        Your private key is stored locally and never sent to any server.
                      </p>
                    </div>
                  </>
                )}

                {walletAddress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Wallet Address</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(walletAddress)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <code className="text-xs text-muted-foreground break-all">{walletAddress}</code>
                  </div>
                )}

                {walletBalance !== null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">Balance:</span>
                    </div>
                    <Badge variant={parseFloat(walletBalance) < 10 ? "destructive" : "default"}>
                      {walletBalance} USDC
                    </Badge>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="x402Amount">Cost per Request</Label>
                  <div className="space-y-2">
                    <Slider
                      id="x402Amount"
                      min={10000}
                      max={1000000}
                      step={10000}
                      value={[parseInt(settings.x402Amount)]}
                      onValueChange={(value) => settings.setX402Amount(value[0].toString())}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>$0.01</span>
                      <span className="font-medium">
                        ${(parseInt(settings.x402Amount) / 1000000).toFixed(2)} USDC
                      </span>
                      <span>$1.00</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="x402Network">Network</Label>
                  <Select
                    value={settings.x402Network}
                    onValueChange={(value) => settings.setX402Network(value as 'base-sepolia' | 'base')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base-sepolia">Base Sepolia (Testnet)</SelectItem>
                      <SelectItem value="base">Base (Mainnet)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {walletBalance !== null && parseFloat(walletBalance) < 10 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Low balance detected. You need at least 10 USDC to use the service effectively.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => window.open(getFaucetUrl(), "_blank")}
                  className="gap-2"
                >
                  Get USDC <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  onClick={checkWalletBalance}
                  disabled={!settings.x402WalletKey || isCheckingBalance}
                >
                  {isCheckingBalance ? "Checking..." : "Check Balance"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle>API Settings</CardTitle>
                <CardDescription>
                  Manage your API keys and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={settings.model}
                    onValueChange={handleModelChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_MODELS.map(
                        (model: (typeof VALID_MODELS)[number]) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This application now uses x402 micropayments exclusively. Please configure your wallet in the x402 Payments tab.
                    </AlertDescription>
                  </Alert>
                </div>
                {/* Removed OpenRouter API Key field */}
                {false && (
                  <div className="space-y-2">
                    <Label htmlFor="deprecated">Deprecated Field</Label>
                    <Input disabled placeholder="No longer used" />
                  </div>
                )}
                {/* Continue with other fields if needed */}
                <div className="space-y-2">
                  <Label>Gigaverse Authentication</Label>
                  <div className="flex flex-col space-y-3">
                    {status === "connected" ? (
                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Connected with Abstract Wallet:
                          </p>
                          <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                            <span className="font-mono text-sm truncate">
                              {address}
                            </span>
                          </div>
                        </div>
                        {settings.gigaverseToken && (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Gigaverse Token:
                            </p>
                            <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                              <span className="font-mono text-sm truncate">
                                {visibleFields.gigaverseToken
                                  ? settings.gigaverseToken
                                  : settings.gigaverseToken.substring(0, 10) +
                                    "..." +
                                    settings.gigaverseToken.substring(
                                      settings.gigaverseToken.length - 5
                                    )}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleVisibility("gigaverseToken")
                                }
                                className="text-muted-foreground hover:text-foreground focus:outline-none"
                                aria-label={
                                  visibleFields.gigaverseToken
                                    ? "Hide Gigaverse Token"
                                    : "Show Gigaverse Token"
                                }
                              >
                                {visibleFields.gigaverseToken ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => logout()}
                          >
                            Disconnect
                          </Button>
                          <Button
                            size="sm"
                            onClick={fetchGigaToken}
                            className={
                              settings.gigaverseToken
                                ? "bg-primary hover:bg-primary/80"
                                : ""
                            }
                          >
                            {settings.gigaverseToken
                              ? "Refresh Token"
                              : "Get Token"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={() => login()}>
                        Connect with Abstract
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSteps">Agent Max Steps</Label>
                  <div className="flex relative">
                    <Input
                      id="maxSteps"
                      name="maxSteps"
                      type="number"
                      value={settings.maxSteps}
                      onChange={handleChange}
                      placeholder="100"
                      className="pr-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxWorkingMemorySize">
                    Agent Max Working Memory Size
                  </Label>
                  <div className="flex relative">
                    <Input
                      id="maxWorkingMemorySize"
                      name="maxWorkingMemorySize"
                      type="number"
                      value={settings.maxWorkingMemorySize}
                      onChange={handleChange}
                      placeholder="100"
                      className="pr-10"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleClearSettings}>
                  Reset Settings
                </Button>
                <Button onClick={handleSaveSettings}>Save Settings</Button>
              </CardFooter>
              {saveStatus && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-primary">{saveStatus}</p>
                </div>
              )}
            </Card>
          </TabsContent>
          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

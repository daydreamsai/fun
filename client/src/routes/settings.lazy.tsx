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
import { Eye, EyeOff, Key, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfile } from "@/components/UserProfile";
import { apiKeyService } from "@/services/apiKeyService";

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
    dreamsRouterApiKey: false,
    gigaverseToken: false,
  });

  // Check if token exists on mount and when token changes
  useEffect(() => {
    if (settings.gigaverseToken) {
      setGigaTokenStatus("success");
    } else {
      setGigaTokenStatus(null);
    }
  }, [settings.gigaverseToken]);

  const validateApiKey = (key: string): boolean => {
    return apiKeyService.validateApiKey(key);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;

    // Only pass valid UserSettings keys
    if (
      name === "dreamsRouterApiKey" ||
      name === "gigaverseToken" ||
      name === "model"
    ) {
      settings.setApiKey(name as keyof UserSettings, e.target.value);
      
      // Update API key service when Dreams Router key changes
      if (name === "dreamsRouterApiKey") {
        if (validateApiKey(e.target.value)) {
          apiKeyService.setApiKey(e.target.value);
        }
      }
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
        <Tabs defaultValue="dreams-router" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="dreams-router">Dreams Router</TabsTrigger>
            <TabsTrigger value="api-keys">API Settings</TabsTrigger>
            <TabsTrigger value="profile">User Profile</TabsTrigger>
          </TabsList>
          <TabsContent value="dreams-router">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Dreams Router API
                </CardTitle>
                <CardDescription>
                  Configure your Dreams Router API key for AI model access. Get your API key from <a href="https://router.daydreams.systems" target="_blank" className="text-blue-500 hover:underline">router.daydreams.systems</a>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dreams Router API Key Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dreamsRouterApiKey">Dreams Router API Key</Label>
                    <div className="flex relative">
                      <Input
                        id="dreamsRouterApiKey"
                        name="dreamsRouterApiKey"
                        type={visibleFields.dreamsRouterApiKey ? "text" : "password"}
                        value={settings.dreamsRouterApiKey}
                        onChange={handleChange}
                        placeholder="Enter your Dreams Router API key..."
                        className="pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleVisibility("dreamsRouterApiKey")}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {visibleFields.dreamsRouterApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get your API key from <a href="https://router.daydreams.systems" target="_blank" className="text-blue-500 hover:underline">router.daydreams.systems</a>. Your key is stored locally and secure.
                    </p>
                  </div>

                  {settings.dreamsRouterApiKey && apiKeyService.isConfigured() && (
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600 dark:text-green-400">
                        Dreams Router API key configured successfully.
                      </AlertDescription>
                    </Alert>
                  )}

                  {settings.dreamsRouterApiKey && !validateApiKey(settings.dreamsRouterApiKey) && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Invalid API key format. Please check your key.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* TODO: Add fallback to OpenRouter option here - user wants to remove this later */}
                {/* <div className="space-y-2">
                  <Label htmlFor="openRouterKey">OpenRouter Fallback (Optional)</Label>
                  <Input
                    id="openRouterKey"
                    name="openRouterKey"
                    type="password"
                    value={settings.openRouterKey || ""}
                    onChange={handleChange}
                    placeholder="Enter OpenRouter API key for fallback..."
                  />
                </div> */}

              </CardContent>
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
                      This application now uses Dreams Router API exclusively. Please configure your API key in the Dreams Router tab.
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

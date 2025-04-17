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
import { Eye, EyeOff } from "lucide-react";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfile } from "@/components/UserProfile";

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
    openaiKey: false,
    openrouterKey: false,
    anthropicKey: false,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Only pass valid UserSettings keys
    if (
      name === "openaiKey" ||
      name === "openrouterKey" ||
      name === "anthropicKey" ||
      name === "gigaverseToken" ||
      name === "model"
    ) {
      settings.setApiKey(name as keyof UserSettings, value);
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
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="api-keys">API Settings</TabsTrigger>
          <TabsTrigger value="profile">User Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <CardDescription>
                Manage your API keys and preferences
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
                <Label htmlFor="openrouterKey">OpenRouter API Key</Label>
                <div className="flex relative">
                  <Input
                    id="openrouterKey"
                    name="openrouterKey"
                    type={visibleFields.openrouterKey ? "text" : "password"}
                    value={settings.openrouterKey}
                    onChange={handleChange}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("openrouterKey")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                    aria-label={
                      visibleFields.openrouterKey
                        ? "Hide OpenRouter API Key"
                        : "Show OpenRouter API Key"
                    }
                  >
                    {visibleFields.openrouterKey ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

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
                              onClick={() => toggleVisibility("gigaverseToken")}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
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
                              ? "bg-green-600 hover:bg-green-700"
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleClearSettings}>
                Reset Settings
              </Button>
              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </CardFooter>
            {saveStatus && (
              <div className="px-6 pb-4">
                <p className="text-sm text-green-600 dark:text-green-400">
                  {saveStatus}
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>
      </Tabs>
    </div>
  );
}

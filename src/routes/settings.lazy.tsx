import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({
    openaiKey: false,
    openrouterKey: false,
    anthropicKey: false,
    gigaverseToken: false,
  });

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
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your API keys and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={settings.model} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {VALID_MODELS.map((model: (typeof VALID_MODELS)[number]) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 
          <div className="space-y-2">
            <Label htmlFor="openaiKey">OpenAI API Key</Label>
            <div className="flex relative">
              <Input
                id="openaiKey"
                name="openaiKey"
                type={visibleFields.openaiKey ? "text" : "password"}
                value={settings.openaiKey}
                onChange={handleChange}
                placeholder="sk-..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("openaiKey")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                aria-label={
                  visibleFields.openaiKey
                    ? "Hide OpenAI API Key"
                    : "Show OpenAI API Key"
                }
              >
                {visibleFields.openaiKey ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div> */}

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

          {/* <div className="space-y-2">
            <Label htmlFor="anthropicKey">Anthropic API Key</Label>
            <div className="flex relative">
              <Input
                id="anthropicKey"
                name="anthropicKey"
                type={visibleFields.anthropicKey ? "text" : "password"}
                value={settings.anthropicKey}
                onChange={handleChange}
                placeholder="sk-..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("anthropicKey")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                aria-label={
                  visibleFields.anthropicKey
                    ? "Hide Anthropic API Key"
                    : "Show Anthropic API Key"
                }
              >
                {visibleFields.anthropicKey ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div> */}

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
                      <p className="font-mono text-sm truncate">{address}</p>
                      <Button variant="destructive" size="sm" onClick={logout}>
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gigaverseToken">Gigaverse Token</Label>
                    <div className="flex relative">
                      <Input
                        id="gigaverseToken"
                        name="gigaverseToken"
                        type={
                          visibleFields.gigaverseToken ? "text" : "password"
                        }
                        value={settings.gigaverseToken}
                        onChange={handleChange}
                        placeholder="Enter your token"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleVisibility("gigaverseToken")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                        aria-label={
                          visibleFields.gigaverseToken
                            ? "Hide Token"
                            : "Show Token"
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

                  <Button onClick={() => fetchGigaToken()} className="w-full">
                    Generate GIGA Token
                  </Button>
                </div>
              ) : (
                <Button onClick={login} className="w-full">
                  Connect with AGW
                </Button>
              )}
            </div>
          </div>

          {saveStatus && (
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-md text-green-800 dark:text-green-200">
              {saveStatus}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClearSettings}>
            Clear Settings
          </Button>
          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

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
  UserSettings,
  getUserSettings,
  saveUserSettings,
  clearUserSettings,
} from "@/utils/settings";
import { Eye, EyeOff } from "lucide-react";

export const Route = createLazyFileRoute("/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const [settings, setSettings] = useState<UserSettings>({
    openaiKey: "",
    openrouterKey: "",
    anthropicKey: "",
    gigaverseToken: "",
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({
    openaiKey: false,
    openrouterKey: false,
    anthropicKey: false,
    gigaverseToken: false,
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = getUserSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleVisibility = (field: string) => {
    setVisibleFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSaveSettings = () => {
    saveUserSettings(settings);
    setSaveStatus("Settings saved successfully!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleClearSettings = () => {
    clearUserSettings();
    setSettings({
      openaiKey: "",
      openrouterKey: "",
      anthropicKey: "",
      gigaverseToken: "",
    });
    setSaveStatus("Settings cleared successfully!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="gigaverseToken">Gigaverse Token</Label>
            <div className="flex relative">
              <Input
                id="gigaverseToken"
                name="gigaverseToken"
                type={visibleFields.gigaverseToken ? "text" : "password"}
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

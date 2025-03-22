import { useState, useCallback, useEffect } from "react";
import { AnyAgent } from "@daydreamsai/core";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Code,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { VALID_MODELS, useSettingsStore } from "@/store/settingsStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { goalContexts } from "@/agent/giga";
import { GameStatus } from "@/components/chat/GameStatus";

export function StateSidebar({
  contextId,
  messages,
  dreams,
  isLoading,
}: {
  contextId: string;
  messages: any[];
  dreams: AnyAgent;
  isLoading?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [memoryStats, setMemoryStats] = useState<{
    size: number;
    lastUpdated: string;
  }>({
    size: 0,
    lastUpdated: "Not loaded",
  });
  const [workingMemory, setWorkingMemory] = useState<any>(null);
  const [showFullMemory, setShowFullMemory] = useState(false);

  // Model selection state
  const settings = useSettingsStore();
  const [selectedModel, setSelectedModel] = useState<
    (typeof VALID_MODELS)[number]
  >(settings.model);
  const [modelChangeNotification, setModelChangeNotification] = useState(false);
  const [goalContext, setGoalContext] = useState<any>(null);

  // Handle model change
  const handleModelChange = useCallback(
    (value: string) => {
      setSelectedModel(value as (typeof VALID_MODELS)[number]);
      settings.setModel(value as (typeof VALID_MODELS)[number]);

      // Show notification
      setModelChangeNotification(true);
      setTimeout(() => {
        setModelChangeNotification(false);
      }, 3000);
    },
    [settings]
  );

  const refreshMemoryStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const memory = await dreams.getWorkingMemory(contextId);
      setWorkingMemory(memory);
      setMemoryStats({
        size: JSON.stringify(memory).length,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      console.error("Failed to refresh memory stats:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [dreams, contextId]);

  useEffect(() => {
    refreshMemoryStats();
  }, [refreshMemoryStats]);

  // Fix async useMemo pattern
  useEffect(() => {
    let isMounted = true;
    const fetchGoalContext = async () => {
      try {
        // Use the goalContexts directly
        if (!goalContexts) {
          console.warn("Goal context not found");
          return;
        }

        const result = await dreams.getContext({
          context: goalContexts,
          args: {
            id: "goal:1",
            initialGoal: "You are a helpful assistant",
            initialTasks: ["You are a helpful assistant"],
          },
        });

        if (isMounted) {
          setGoalContext(result);
        }
      } catch (error) {
        console.error("Failed to fetch goal context:", error);
      }
    };

    fetchGoalContext();

    return () => {
      isMounted = false;
    };
  }, [dreams]);

  if (isCollapsed) {
    return (
      <div className="border-l bg-background/95 backdrop-blur flex flex-col items-center py-4 h-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-background/95 backdrop-blur flex flex-col">
      <div className="flex justify-between items-center p-4">
        <h3 className="font-medium">Chat State</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshMemoryStats}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Model Selection Dropdown */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Model</span>
        </div>
        <Select value={selectedModel} onValueChange={handleModelChange}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {VALID_MODELS.map((model) => {
              // Create a more user-friendly display name
              const displayName = model
                .split("/")
                .pop()
                ?.replace(/-/g, " ")
                .replace(/:beta$/, " (Beta)");

              return (
                <SelectItem key={model} value={model} className="text-sm">
                  {displayName || model}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Model change notification */}
        {modelChangeNotification && (
          <div className="mt-4 text-xs p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md transition-opacity duration-300">
            Model changed to{" "}
            <span className="font-medium">
              {selectedModel
                .split("/")
                .pop()
                ?.replace(/-/g, " ")
                .replace(/:beta$/, " (Beta)")}
            </span>
            . New messages will use this model.
          </div>
        )}
      </div>

      {/* Message Display Settings */}
      <div className="px-4 pb-2 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Display Settings</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="showThoughts" className="text-sm">
              Show Thoughts
            </Label>
            <Switch
              id="showThoughts"
              checked={settings.showThoughtMessages}
              onCheckedChange={(checked) => {
                settings.setShowThoughtMessages(checked);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showSystem" className="text-sm">
              Show System Messages
            </Label>
            <Switch
              id="showSystem"
              checked={settings.showSystemMessages}
              onCheckedChange={(checked) => {
                settings.setShowSystemMessages(checked);
              }}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4 my-2"></div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 mx-4 ">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="flex-1 px-4 overflow-hidden border-primary/20"
        >
          <ScrollArea className="h-[calc(100vh-180px)] pb-36">
            {/* Game status component */}
            <GameStatus goalContext={goalContext} />

            <Card className="p-3 mb-3">
              <h4 className="text-sm font-medium mb-1">Context ID</h4>
              <p className="text-xs text-muted-foreground break-all">
                {contextId}
              </p>
            </Card>

            <Card className="p-3 mb-3">
              <h4 className="text-sm font-medium mb-1">Message Count</h4>
              <p className="text-xs">{messages.length}</p>
            </Card>

            <Card className="p-3 mb-3">
              <h4 className="text-sm font-medium mb-1">Last Message</h4>
              <p className="text-xs text-muted-foreground">
                {messages.length > 0
                  ? `${messages[messages.length - 1].type}: ${messages[messages.length - 1]?.message?.substring(0, 50)}${messages[messages.length - 1]?.message?.length > 50 ? "..." : ""}`
                  : "No messages yet"}
              </p>
            </Card>

            <Card className="p-3 mb-3">
              <h4 className="text-sm font-medium mb-1">Agent Status</h4>
              <div className="text-xs flex items-center">
                {isLoading ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      Active - Processing
                    </span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                    <span>Idle - Ready</span>
                  </>
                )}
              </div>
            </Card>

            <Card className="p-3 mb-3">
              <h4 className="text-sm font-medium mb-1">Message Types</h4>
              <div className="text-xs">
                <p>User: {messages.filter((m) => m.type === "user").length}</p>
                <p>
                  Agent: {messages.filter((m) => m.type === "agent").length}
                </p>
                <p>
                  System: {messages.filter((m) => m.type === "system").length}
                </p>
              </div>
            </Card>

            <Card className="p-3 mb-3">
              <h4 className="text-sm font-medium mb-1">Working Memory</h4>
              <div className="text-xs">
                <p>Size: {(memoryStats.size / 1024).toFixed(2)} KB</p>
                <p>Last Updated: {memoryStats.lastUpdated}</p>
              </div>
            </Card>

            <Card className="p-3">
              <h4 className="text-sm font-medium mb-1">Chat Info</h4>
              <div className="text-xs">
                <p>Chat ID: {contextId.split(":").pop()}</p>
                <p>Started: {new Date().toLocaleDateString()}</p>
              </div>
            </Card>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="memory"
          className="flex-1 flex flex-col pt-2 overflow-hidden border"
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">Working Memory</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFullMemory(!showFullMemory)}
            >
              {showFullMemory ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Card className="p-3 flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {workingMemory ? (
                <pre className="text-xs whitespace-pre-wrap">
                  {showFullMemory
                    ? JSON.stringify(workingMemory, null, 2)
                    : JSON.stringify(
                        {
                          // Show only key memory elements
                          messages: workingMemory.messages?.length || 0,
                          context: workingMemory.context,
                          // Add a summary of other keys
                          keys: Object.keys(workingMemory),
                        },
                        null,
                        2
                      )}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Loading memory...
                </p>
              )}
            </ScrollArea>
          </Card>

          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                // Copy memory to clipboard
                navigator.clipboard.writeText(
                  JSON.stringify(workingMemory, null, 2)
                );
              }}
            >
              <Code className="h-3 w-3 mr-1" />
              Copy JSON
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

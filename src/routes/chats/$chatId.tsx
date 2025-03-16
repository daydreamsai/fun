import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MessagesList } from "@/components/message-list";
import { AnyAgent, getWorkingMemoryLogs } from "@daydreamsai/core";
import { SidebarRight } from "@/components/sidebar-right";
import { chat } from "@/agent/chat";
import { v7 as randomUUIDv7 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages } from "@/hooks/use-messages";
import { Card } from "@/components/ui/card";
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
import { giga } from "@/agent/giga";
import {
  hasApiKey,
  VALID_MODELS,
  useSettingsStore,
} from "@/store/settingsStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgentStore } from "@/store/agentStore";

export const Route = createFileRoute("/chats/$chatId")({
  component: RouteComponent,
  context() {
    return {
      SideBar: SidebarRight,
      sidebarProps: {
        className:
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      },
    };
  },
  loader({ params }) {
    // Check if user has required API keys
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    const hasGigaverseToken = hasApiKey("gigaverseToken");

    // If neither key is available, redirect to settings
    if (!hasOpenRouterKey && !hasGigaverseToken) {
      return redirect({
        to: "/settings",
      });
    }

    // Handle "new" chat redirect
    if (params.chatId === "new") {
      return redirect({
        to: "/chats/$chatId",
        params: {
          chatId: randomUUIDv7(),
        },
      });
    }
  },
});

// State Sidebar Component
function StateSidebar({
  contextId,
  messages,
  dreams,
}: {
  contextId: string;
  messages: any[];
  dreams: AnyAgent;
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
        const result = await dreams.getContext({
          context: giga.contexts!.goal,
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
          className="flex-1 px-4  overflow-hidden  border-primary/20 "
        >
          <ScrollArea className="h-[calc(100vh-180px)] pb-36">
            <Card className="p-4 mb-4 border-2 border-primary/20 bg-primary/5">
              <h4 className="text-base font-semibold mb-3 text-primary">
                Game State
              </h4>
              <div className="space-y-3">
                <div className="bg-background/80 p-3 rounded-md">
                  <h5 className="text-sm font-medium mb-2 text-primary/80">
                    Location
                  </h5>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Room:</span>
                    <span className="text-sm font-medium">
                      {goalContext?.memory?.currentRoom || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dungeon:</span>
                    <span className="text-sm font-medium">
                      {goalContext?.memory?.currentDungeon || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="bg-background/80 p-3 rounded-md">
                  <h5 className="text-sm font-medium mb-2 text-primary/80">
                    Battle Status
                  </h5>
                  <div className="text-sm">
                    {goalContext?.memory?.lastBattleResult ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Result:</span>
                          <span className="font-medium">
                            {goalContext?.memory?.lastBattleResult}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Enemy Move:</span>
                          <span className="font-medium">
                            {goalContext?.memory?.lastEnemyMove}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        No battles yet
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/80 p-3 rounded-md">
                    <h5 className="text-sm font-medium mb-2 text-primary/80">
                      Player
                    </h5>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">HP:</span>
                        <span className="text-sm font-medium">
                          {goalContext?.memory?.playerHealth || 0}/
                          {goalContext?.memory?.playerMaxHealth || 0}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${
                              goalContext?.memory?.playerHealth &&
                              goalContext?.memory?.playerMaxHealth
                                ? (goalContext?.memory?.playerHealth /
                                    goalContext?.memory?.playerMaxHealth) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm">Shield:</span>
                        <span className="text-sm font-medium">
                          {goalContext?.memory?.playerShield || 0}/
                          {goalContext?.memory?.playerMaxShield || 0}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${
                              goalContext?.memory?.playerShield &&
                              goalContext?.memory?.playerMaxShield
                                ? (goalContext?.memory?.playerShield /
                                    goalContext?.memory?.playerMaxShield) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background/80 p-3 rounded-md">
                    <h5 className="text-sm font-medium mb-2 text-primary/80">
                      Enemy
                    </h5>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">HP:</span>
                        <span className="text-sm font-medium">
                          {goalContext?.memory?.enemyHealth || 0}/
                          {goalContext?.memory?.enemyMaxHealth || 0}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${
                              goalContext?.memory?.enemyHealth &&
                              goalContext?.memory?.enemyMaxHealth
                                ? (goalContext?.memory?.enemyHealth /
                                    goalContext?.memory?.enemyMaxHealth) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm">Shield:</span>
                        <span className="text-sm font-medium">
                          {goalContext?.memory?.enemyShield || 0}/
                          {goalContext?.memory?.enemyMaxShield || 0}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{
                            width: `${
                              goalContext?.memory?.enemyShield &&
                              goalContext?.memory?.enemyMaxShield
                                ? (goalContext?.memory?.enemyShield /
                                    goalContext?.memory?.enemyMaxShield) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-background/80 p-3 rounded-md">
                  <h5 className="text-sm font-medium mb-2 text-primary/80">
                    Weapons
                  </h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border rounded-md p-2 text-center">
                      <div className="font-medium">Rock</div>
                      <div className="text-xs mt-1">
                        <div>ATK: {goalContext?.memory?.rockAttack || 0}</div>
                        <div>DEF: {goalContext?.memory?.rockDefense || 0}</div>
                        <div>
                          Charges: {goalContext?.memory?.rockCharges || 0}
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-md p-2 text-center">
                      <div className="font-medium">Paper</div>
                      <div className="text-xs mt-1">
                        <div>ATK: {goalContext?.memory?.paperAttack || 0}</div>
                        <div>DEF: {goalContext?.memory?.paperDefense || 0}</div>
                        <div>
                          Charges: {goalContext?.memory?.paperCharges || 0}
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-md p-2 text-center">
                      <div className="font-medium">Scissor</div>
                      <div className="text-xs mt-1">
                        <div>
                          ATK: {goalContext?.memory?.scissorAttack || 0}
                        </div>
                        <div>
                          DEF: {goalContext?.memory?.scissorDefense || 0}
                        </div>
                        <div>
                          Charges: {goalContext?.memory?.scissorCharges || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-background/80 p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Loot Phase:</span>
                    <span className="text-sm">
                      {goalContext?.memory?.lootPhase || "None"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

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

function RouteComponent() {
  const { chatId } = Route.useParams();

  const dreams = useAgentStore((state) => state.agent);
  const { messages, setMessages, handleLog } = useMessages();

  // Check API keys for notification
  const [missingKeys, setMissingKeys] = useState<string[]>([]);

  useEffect(() => {
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    const hasGigaverseToken = hasApiKey("gigaverseToken");

    const missing: string[] = [];
    if (!hasOpenRouterKey) missing.push("OpenRouter");
    if (!hasGigaverseToken) missing.push("Gigaverse");

    setMissingKeys(missing);
  }, []);

  const contextId = useMemo(
    () =>
      dreams.getContextId({
        context: chat.contexts!.chat,
        args: {
          chatId,
        },
      }),
    [dreams, chatId]
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    setMessages([]);

    // Check if agent is already initialized before calling start
    const loadMessages = async () => {
      try {
        // Try to access working memory - if this succeeds, agent is already initialized
        const workingMemory = await dreams.getWorkingMemory(contextId);
        getWorkingMemoryLogs(workingMemory).map((log) => handleLog(log, true));
      } catch (error) {
        console.log("Agent not initialized, starting...");
        // If accessing working memory fails, initialize the agent
        await dreams.start();
        const workingMemory = await dreams.getWorkingMemory(contextId);
        getWorkingMemoryLogs(workingMemory).map((log) => handleLog(log, true));
      }

      // Invalidate the chats query to ensure sidebar is updated
      queryClient.invalidateQueries({ queryKey: ["agent:chats"] });
    };

    loadMessages();
  }, [dreams, chatId, contextId, handleLog, setMessages, queryClient]);

  useEffect(() => {
    const SCROLL_THRESHOLD = 200;
    let userScrolled = false;

    const isNearBottom = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight);

      return distanceFromBottom <= SCROLL_THRESHOLD;
    };

    // When user starts scrolling manually
    const handleUserScroll = () => {
      userScrolled = true;

      // Reset the flag after a short delay
      setTimeout(() => {
        userScrolled = false;
      }, 1000);
    };

    // Add scroll event listener
    window.addEventListener("wheel", handleUserScroll);
    window.addEventListener("touchmove", handleUserScroll);

    // Only auto-scroll if user hasn't manually scrolled
    if (isNearBottom() && !userScrolled) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }

    // Cleanup event listeners
    return () => {
      window.removeEventListener("wheel", handleUserScroll);
      window.removeEventListener("touchmove", handleUserScroll);
    };
  }, [messages]);

  return (
    <>
      {/* API Key Notification */}
      {missingKeys.length > 0 && missingKeys.length < 2 && (
        <div className="bg-amber-100 dark:bg-amber-900 p-3 text-amber-800 dark:text-amber-200 text-sm flex justify-between items-center">
          <div>
            <span className="font-medium">Note:</span> You're missing the{" "}
            {missingKeys.join(", ")} API key. You can still use the app, but
            setting up all keys is recommended for the best experience.
          </div>
          <Button variant="outline" size="sm">
            <Link to="/settings">Go to Settings</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-1 relative h-[calc(100vh-64px)]">
        <div className="flex flex-col flex-1 z-0 overflow-y-auto">
          <div
            className="flex-1 p-4 pb-36 mx-auto w-full pr-96"
            ref={scrollRef}
          >
            {missingKeys.length === 2 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-red-100 dark:bg-red-900 p-6 rounded-lg max-w-md text-center">
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                    API Keys Required
                  </h3>
                  <p className="text-red-700 dark:text-red-300 mb-4">
                    You need to set up either an OpenRouter API key or a
                    Gigaverse token to use this application.
                  </p>
                  <Button
                    onClick={() => {
                      window.location.href = "/settings";
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Go to Settings
                  </Button>
                </div>
              </div>
            ) : (
              <MessagesList messages={messages} />
            )}
          </div>
        </div>

        {/* State Sidebar */}
        <div className="fixed right-0 top-18 h-screen">
          <StateSidebar
            contextId={contextId}
            messages={messages}
            dreams={dreams}
          />
        </div>
      </div>
      <form
        className="bg-background flex items-center mt-auto sticky bottom-0 left-0 right-0 z-10"
        onSubmit={async (e) => {
          e.preventDefault();
          const msg = new FormData(e.currentTarget).get("message") as string;

          setMessages((msgs) => [
            ...msgs,
            {
              id: Date.now().toString(),
              type: "user",
              message: msg,
            },
          ]);

          e.currentTarget.reset();

          await dreams.send({
            context: chat.contexts!.chat,
            args: {
              chatId,
            },
            input: {
              type: "message",
              data: {
                user: "player",
                content: msg,
              },
            },
            handlers: {
              onLogStream(log, done) {
                handleLog(log, done);
              },
            },
          });

          if (messages.length === 0) {
            queryClient.invalidateQueries({
              queryKey: ["agent:chats"],
            });
          }
        }}
      >
        <input
          type="text"
          name="message"
          placeholder={
            missingKeys.length === 2
              ? "Please set up API keys in settings to start chatting"
              : "Type your message..."
          }
          className="border flex-1 px-6 py-4 rounded-lg bg-background text-foreground placeholder:text-primary focus:outline-none focus:border-primary"
          disabled={missingKeys.length === 2} // Disable input if no API keys are set
        />
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary h-full w-1/4 max-w-64 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={missingKeys.length === 2} // Disable button if no API keys are set
        >
          Send
        </button>
      </form>
    </>
  );
}

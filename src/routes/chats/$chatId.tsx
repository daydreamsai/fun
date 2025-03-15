import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessagesList } from "@/components/message-list";
import { getWorkingMemoryLogs } from "@daydreamsai/core";
import { SidebarRight } from "@/components/sidebar-right";
import { useAgent } from "@/hooks/use-agent";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { giga } from "@/agent/giga";

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
  dreams: ReturnType<typeof useAgent>;
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

  const refreshMemoryStats = async () => {
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
  };

  useEffect(() => {
    refreshMemoryStats();
  }, [contextId]);

  const [goalContext, setGoalContext] = useState<any>(null);

  const context = useMemo(async () => {
    return await dreams.getContext({
      context: giga.contexts!.goal,

      args: {
        id: "goal:1",
        initialGoal: "You are a helpful assistant",
        initialTasks: ["You are a helpful assistant"],
      },
    });
  }, [dreams, contextId]);

  useEffect(() => {
    context.then((result) => {
      setGoalContext(result);
    });
  }, []);

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
    <div className="w-72 border-l bg-background/95 backdrop-blur h-full flex flex-col">
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

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 mx-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="flex-1 p-4 pt-2 overflow-hidden"
        >
          <ScrollArea className="h-[calc(100vh-180px)]">
            <Card className="p-3 mb-3">
              <h4 className="text-sm font-medium mb-1">Context ID</h4>
              <p className="text-xs text-muted-foreground break-all">
                {contextId}
              </p>
            </Card>

            <Card className="p-3 mb-3">
              <h4 className="text-sm font-medium mb-1">Context</h4>
              <div className="text-xs text-muted-foreground">
                <div className="mb-1">
                  <span className="font-medium">Game State:</span> Room{" "}
                  {goalContext?.memory?.currentRoom} in Dungeon{" "}
                  {goalContext?.memory?.currentDungeon}
                </div>
                <div className="mb-1">
                  <span className="font-medium">Battle:</span>{" "}
                  {goalContext?.memory?.lastBattleResult
                    ? `Last result: ${goalContext?.memory?.lastBattleResult}, Enemy used: ${goalContext?.memory?.lastEnemyMove}`
                    : "No battles yet"}
                </div>
                <div className="mb-1">
                  <span className="font-medium">Player:</span> HP{" "}
                  {goalContext?.memory?.playerHealth}/
                  {goalContext?.memory?.playerMaxHealth}, Shield{" "}
                  {goalContext?.memory?.playerShield}/
                  {goalContext?.memory?.playerMaxShield}
                </div>
                <div className="mb-1">
                  <span className="font-medium">Enemy:</span> HP{" "}
                  {goalContext?.memory?.enemyHealth}/
                  {goalContext?.memory?.enemyMaxHealth}, Shield{" "}
                  {goalContext?.memory?.enemyShield}/
                  {goalContext?.memory?.enemyMaxShield}
                </div>
                <div className="mb-1">
                  <span className="font-medium">Weapons:</span> Rock (
                  {goalContext?.memory?.rockAttack}/
                  {goalContext?.memory?.rockDefense}/
                  {goalContext?.memory?.rockCharges}), Paper (
                  {goalContext?.memory?.paperAttack}/
                  {goalContext?.memory?.paperDefense}/
                  {goalContext?.memory?.paperCharges}), Scissor (
                  {goalContext?.memory?.scissorAttack}/
                  {goalContext?.memory?.scissorDefense}/
                  {goalContext?.memory?.scissorCharges})
                </div>
                <div>
                  <span className="font-medium">Loot Phase:</span>{" "}
                  {goalContext?.memory?.lootPhase}
                </div>
              </div>
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
          className="flex-1 flex flex-col p-4 pt-2 overflow-hidden"
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

  const dreams = useAgent();
  const { messages, setMessages, handleLog } = useMessages();

  const contextId = dreams.getContextId({
    context: chat.contexts!.chat,
    args: {
      chatId,
    },
  });

  const context = useMemo(async () => {
    return await dreams.getContext({
      context: giga.contexts!.goal,

      args: {
        id: "goal:1",
        initialGoal: "You are a helpful assistant",
        initialTasks: ["You are a helpful assistant"],
      },
    });
  }, [dreams, chatId]);

  useEffect(() => {
    context.then((result) => {
      console.log("context", result);
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    dreams.start().then(async () => {
      const workingMemory = await dreams.getWorkingMemory(contextId);
      getWorkingMemoryLogs(workingMemory).map((log) => handleLog(log, true));
    });
  }, [dreams, chatId]);

  const queryClient = useQueryClient();

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
      <div className="flex flex-1 relative h-[calc(100vh-64px)]">
        <div className="flex flex-col flex-1 z-0 overflow-y-auto">
          <div
            className="flex-1 p-4 pb-36 max-w-3xl mx-auto w-full"
            ref={scrollRef}
          >
            <MessagesList messages={messages} />
          </div>
        </div>

        {/* State Sidebar */}
        <div className="fixed right-0 top-0">
          <StateSidebar
            contextId={contextId}
            messages={messages}
            dreams={dreams}
          />
        </div>
      </div>
      <form
        className="bg-background flex items-center mt-auto sticky bottom-0 left-0 right-0 z-10 pr-72"
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
                user: "galego",
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
          placeholder="Type your message..."
          className="border flex-1 px-6 py-4 rounded-lg bg-background text-foreground placeholder:text-primary focus:outline-none focus:border-primary"
          disabled={false} // Disable input while loading history
        />
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary h-full w-1/4 max-w-64 disabled:opacity-50 disabled:cursor-not-allowed">
          Send
        </button>
      </form>
    </>
  );
}

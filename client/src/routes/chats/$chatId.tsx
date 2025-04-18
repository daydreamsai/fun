import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";

import { MessagesList } from "@/components/message-list";
import { getWorkingMemoryLogs } from "@daydreamsai/core";
import { SidebarRight } from "@/components/sidebar-right";
import { v7 as randomUUIDv7 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages } from "@/hooks/use-messages";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { HelpCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

import { hasApiKey, useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";

// Import our components
import { StateSidebar, HelpWindow, MessageInput } from "@/components/chat";
import { gigaverseContext } from "@/agent/giga";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import clsx from "clsx";

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

function RouteComponent() {
  const { chatId } = Route.useParams();

  const dreams = useAgentStore((state) => state.agent);
  const {
    messages,
    setMessages,
    handleLog,
    isLoading,
    setIsLoading,
    thoughts,
  } = useMessages();

  // Settings for help window
  const showHelpWindow = useSettingsStore((state) => state.showHelpWindow);
  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );
  const [helpDialogOpen, setHelpDialogOpen] = useState(showHelpWindow);

  // Handle help dialog state changes
  const handleHelpDialogChange = useCallback(
    (open: boolean) => {
      setHelpDialogOpen(open);
      if (!open) {
        setShowHelpWindow(false);
      }
    },
    [setShowHelpWindow]
  );

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
        context: gigaverseContext,
        args: {
          id: chatId,
        },
      }),
    [dreams, chatId]
  );

  // Use our custom hook for scroll management
  const messagesContainerRef = useAutoScroll([messages], {
    threshold: 150,
    behavior: "auto",
  });

  // Track first load to ensure we scroll to bottom
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    setMessages([]);
    setInitialLoadComplete(false); // Reset on new chat

    // Check if agent is already initialized before calling start
    const loadMessages = async () => {
      try {
        // Try to access working memory - if this succeeds, agent is already initialized
        const workingMemory = await dreams.getWorkingMemory(contextId);
        getWorkingMemoryLogs(workingMemory).map((log) => handleLog(log, true));
        // Mark initial load as complete after a short delay
        setTimeout(() => setInitialLoadComplete(true), 300);
      } catch (error) {
        console.log("Agent not initialized, starting...");
        // If accessing working memory fails, initialize the agent
        await dreams.start();
        const workingMemory = await dreams.getWorkingMemory(contextId);
        getWorkingMemoryLogs(workingMemory).map((log) => handleLog(log, true));
        // Mark initial load as complete after a short delay
        setTimeout(() => setInitialLoadComplete(true), 300);
      }

      // Invalidate the chats query to ensure sidebar is updated
      queryClient.invalidateQueries({ queryKey: ["agent:chats"] });
    };

    loadMessages();
  }, [dreams, chatId, contextId, handleLog, setMessages, queryClient]);

  // Explicitly scroll to the bottom after initial load
  useEffect(() => {
    if (initialLoadComplete && messages.length > 0) {
      // Force immediate scroll after initial load
      if ((messagesContainerRef as any).scrollToBottom) {
        (messagesContainerRef as any).scrollToBottom("auto");
      }
    }
  }, [initialLoadComplete, messages.length, messagesContainerRef]);

  // Handle message submission
  const handleSubmitMessage = async (message: string) => {
    setIsLoading(true);

    // Force immediate scroll after adding user message
    if ((messagesContainerRef as any).scrollToBottom) {
      setTimeout(() => {
        (messagesContainerRef as any).scrollToBottom("auto");
      }, 50);
    }

    try {
      await dreams.send({
        context: gigaverseContext,
        args: {
          id: chatId,
        },
        input: {
          type: "message",
          data: {
            user: "player",
            content: message,
          },
        },
        handlers: {
          onLogStream(log, done) {
            handleLog(log, done);
          },
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
    }

    if (messages.length === 0) {
      queryClient.invalidateQueries({
        queryKey: ["agent:chats"],
      });
    }
  };

  // State for mobile sidebar
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <>
      {/* Help Window */}
      <HelpWindow open={helpDialogOpen} onOpenChange={handleHelpDialogChange} />

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

      {/* Main container: flex-col by default, lg:flex-row for larger screens */}
      <div className="flex flex-col lg:flex-row flex-1 relative h-full">
        {/* Messages container: takes full width on small screens, allows space for sidebar on large screens */}
        <div
          className="flex flex-col flex-1 z-0 overflow-y-auto "
          ref={messagesContainerRef}
          style={{
            scrollBehavior: "smooth",
            scrollPaddingBottom: "250px", // Adjust as needed based on MessageInput height
          }}
        >
          {/* Content within messages container: centered with max-width */}
          <div className="flex-1 p-4 w-full max-w-4xl mx-auto">
            <Card className="mb-4 max-h-[250px] min-h-[250px] overflow-y-auto">
              <CardHeader>
                <CardTitle>Agent Thoughts</CardTitle>
              </CardHeader>
              <CardContent>
                {thoughts.length > 0 ? (
                  <div key={thoughts[thoughts.length - 1].id}>
                    {thoughts[thoughts.length - 1].message}
                  </div>
                ) : (
                  <p>This agent is currently thinking...</p>
                )}
              </CardContent>
            </Card>
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
              <MessagesList messages={messages} isLoading={isLoading} />
            )}
          </div>
        </div>

        {/* Sidebar Toggle Button (Mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-50 lg:hidden" // Show only on small screens
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Mobile Sidebar Backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Wrapper div for State Sidebar: Handles responsive visibility and layout */}
        {/* Default: Hidden on small screens, flex on large */}
        {/* Mobile: Fixed position, slide-in animation */}
        <div
          className={clsx(
            "flex-col flex-shrink-0 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-y-auto transition-transform duration-300 ease-in-out",
            "lg:flex lg:static lg:translate-x-0 lg:z-auto lg:border-l", // Large screen styles (static positioning)
            {
              "fixed inset-y-0 right-0 z-40 translate-x-0": isMobileSidebarOpen, // Mobile open styles
              "fixed inset-y-0 right-0 z-40 translate-x-full":
                !isMobileSidebarOpen, // Mobile closed styles
            }
          )}
        >
          <StateSidebar
            contextId={contextId}
            messages={messages}
            dreams={dreams}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Help button: Adjusted right margin for smaller screens */}
      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-20 right-4 lg:right-8 z-50 rounded-full h-10 w-10"
        onClick={() => setHelpDialogOpen(!helpDialogOpen)}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      <MessageInput
        isLoading={isLoading}
        disabled={missingKeys.length === 2}
        onSubmit={handleSubmitMessage}
        placeholderText={
          missingKeys.length === 2
            ? "Please set up API keys in settings to start chatting"
            : undefined
        }
      />
    </>
  );
}

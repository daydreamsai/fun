import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";

import { MessagesList } from "@/components/message-list";
import { getWorkingMemoryLogs } from "@daydreamsai/core";
import { SidebarRight } from "@/components/sidebar-right";
import { v7 as randomUUIDv7 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages } from "@/hooks/use-messages";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { hasApiKey, useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";

// Import our components
import { StateSidebar, HelpWindow, MessageInput } from "@/components/chat";
import { goalContexts } from "@/agent/giga";

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
  const { messages, setMessages, handleLog, isLoading, setIsLoading } =
    useMessages();

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
        context: goalContexts,
        args: {
          id: chatId,
          initialGoal:
            "You are a dungeon crawler. You are currently in the dungeon. You need to find the exit.",
          initialTasks: ["You need to find the exit."],
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

    // Add user message
    setMessages((msgs) => [
      ...msgs,
      {
        id: Date.now().toString(),
        type: "user",
        message,
      },
    ]);

    // Force immediate scroll after adding user message
    if ((messagesContainerRef as any).scrollToBottom) {
      setTimeout(() => {
        (messagesContainerRef as any).scrollToBottom("auto");
      }, 50);
    }

    try {
      await dreams.send({
        context: goalContexts,
        args: {
          id: chatId,
          initialGoal:
            "You are a dungeon crawler. You are currently in the dungeon. You need to find the exit.",
          initialTasks: ["You need to find the exit."],
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

      <div className="flex flex-1 relative h-[calc(100vh-64px)]">
        {/* Use ref for the messages container */}
        <div
          className="flex flex-col flex-1 z-0 overflow-y-auto"
          ref={messagesContainerRef}
          style={{
            scrollBehavior: "smooth",
            scrollPaddingBottom: "250px", // Add padding to avoid messages being hidden behind the input
          }}
        >
          <div className="flex-1 p-4 pb-36 mx-auto w-full pr-96">
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
            {/* Add a spacer div to ensure content isn't hidden behind the input */}
            <div className="h-24" />
          </div>
        </div>

        {/* State Sidebar */}
        <div className="fixed right-0 top-18 h-screen">
          <StateSidebar
            contextId={contextId}
            messages={messages}
            dreams={dreams}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Help button fixed to bottom right */}

      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-20 right-8 z-50 rounded-full h-10 w-10"
        onClick={() => setHelpDialogOpen(true)}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {/* Message Input */}
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

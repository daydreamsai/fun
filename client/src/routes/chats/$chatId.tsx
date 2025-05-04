import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { v7 as randomUUIDv7 } from "uuid";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { Button } from "@/components/ui/button";
import { hasApiKey, useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { HelpWindow, MessageInput } from "@/components/chat";
import { useLogs, useSend } from "@/hooks/agent";
import { LogsList } from "@/components/chat/LogsLIst";
import { chatContext } from "@/agent/chat";

export const Route = createFileRoute("/chats/$chatId")({
  component: RouteComponent,

  loader({ params }: { params: { chatId: string } }) {
    // Check if user has required API keys
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    // If neither key is available, redirect to settings
    if (!hasOpenRouterKey) {
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
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const agent = useAgentStore((state) => state.agent);
  const showHelpWindow = useSettingsStore((state) => state.showHelpWindow);
  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );

  useEffect(() => {
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    const missing: string[] = [];
    if (!hasOpenRouterKey) missing.push("OpenRouter");
    setMissingKeys(missing);
  }, []);

  const { logs } = useLogs({
    agent: agent,
    context: chatContext,
    args: { chatId },
  });

  const { send, abortControllerRef } = useSend({
    agent: agent,
    context: chatContext,
    args: { chatId },
  });

  const handleSubmitMessage = async (message: string) => {
    send.mutate({
      input: {
        type: "message",
        data: {
          user: "player",
          content: message,
        },
      },
    });
  };

  const messagesContainerRef = useAutoScroll([logs], {
    threshold: 150,
    behavior: "auto",
  });

  return (
    <>
      <HelpWindow open={showHelpWindow} onOpenChange={setShowHelpWindow} />

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
      {/* Messages container: takes full width on small screens, allows space for sidebar on large screens */}
      <div className="flex flex-row h-full">
        <div
          className="flex flex-col flex-1 overflow-y-scroll pb-80 px-6 mr-0.5 pt-8"
          ref={messagesContainerRef}
          style={{
            scrollBehavior: "smooth",
            scrollPaddingBottom: "250px", // Adjust as needed based on MessageInput height
          }}
        >
          <LogsList logs={logs} components={{}} />
        </div>
      </div>
      <div className="bg-background flex mt-auto sticky bottom-0 left-0 right-0 w-full">
        <MessageInput
          isLoading={send.isPending}
          disabled={missingKeys.length === 2}
          onSubmit={handleSubmitMessage}
          abortControllerRef={abortControllerRef}
          placeholderText={
            missingKeys.length === 2
              ? "Please set up API keys in settings to start chatting"
              : undefined
          }
        />
      </div>
    </>
  );
}

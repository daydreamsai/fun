import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { v7 as randomUUIDv7 } from "uuid";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { Button } from "@/components/ui/button";
import { hasApiKey, useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { HelpWindow, MessageInput } from "@/components/chat";
import { useContextState, useLogs, useSend } from "@/hooks/agent";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { gigaverseContext } from "@/games/gigaverse/context";
import {
  defaultInstructions,
  defaultRules,
  gigaverseVariables,
} from "@/games/gigaverse/prompts";
import { GigaverseSidebar } from "@/games/gigaverse/components/Sidebar";
import { GigaverseAction } from "@/games/gigaverse/components/Actions";
import { ActionResult } from "@daydreamsai/core";
import { LogsList } from "@/components/chat/LogsLIst";
import { TemplateEditorDialog } from "@/components/chat/template-editor-dialog";
import { ScrollText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function GigaverSidebarWrapper({ chatId }: { chatId: string }) {
  return (
    <Sidebar
      collapsible="none"
      className={cn("w-96 border-l min-h-svh max-h-svh shrink-0 h-full")}
      side="right"
    >
      <SidebarContent className="bg-sidebar">
        <GigaverseSidebar args={{ id: chatId }} />
      </SidebarContent>
    </Sidebar>
  );
}

export const Route = createFileRoute("/games/gigaverse/$chatId")({
  component: RouteComponent,
  context({ params }) {
    return {
      sidebar: <GigaverSidebarWrapper chatId={params.chatId} />,
    };
  },
  loader({ params }: { params: { chatId: string } }) {
    // Check if user has required API keys
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    const hasGigaverseToken = hasApiKey("gigaverseToken");

    // If neither key is available, redirect to settings
    if (!hasOpenRouterKey && !hasGigaverseToken) {
      throw redirect({
        to: "/settings",
      });
    }

    // Handle "new" chat redirect
    if (params.chatId === "new") {
      throw redirect({
        to: "/games/gigaverse/$chatId",
        params: {
          chatId: randomUUIDv7(),
        },
      });
    }
  },
});

function RouteComponent() {
  const { chatId } = Route.useParams();

  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const agent = useAgentStore((state) => state.agent);

  const showHelpWindow = useSettingsStore((state) => state.showHelpWindow);
  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );

  useEffect(() => {
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    const hasGigaverseToken = hasApiKey("gigaverseToken");

    const missing: string[] = [];
    if (!hasOpenRouterKey) missing.push("OpenRouter");
    if (!hasGigaverseToken) missing.push("Gigaverse");

    setMissingKeys(missing);
  }, []);

  const { logs, clearMemory } = useLogs({
    agent: agent,
    context: gigaverseContext,
    args: { id: chatId },
  });

  const { send, abortControllerRef } = useSend({
    agent: agent,
    context: gigaverseContext,
    args: { id: chatId },
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

  const ctxState = useContextState({
    agent,
    context: gigaverseContext,
    args: { id: chatId },
  });

  return (
    <>
      <HelpWindow open={showHelpWindow} onOpenChange={setShowHelpWindow} />
      <TemplateEditorDialog
        open={showTemplateEditor}
        title="Gigaverse Instructions"
        variables={gigaverseVariables}
        templateKey="gigaverse"
        sections={{
          instructions: {
            label: "Gigaverse Strategy",
            default: {
              id: "gigaverse-instructions-default",
              title: "Default",
              section: "instructions",
              prompt: defaultInstructions,
              tags: ["default"],
            },
          },
          rules: {
            label: "Gigaverse Rules",
            default: {
              id: "gigaverse-rules-default",
              title: "Default",
              section: "rules",
              prompt: defaultRules,
              tags: ["default"],
            },
          },
        }}
        onOpenChange={setShowTemplateEditor}
      />

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
      <div
        className="flex flex-col flex-1 px-6 mr-0.5 overflow-y-scroll pt-8 pb-40"
        ref={messagesContainerRef}
        style={{
          scrollBehavior: "smooth",
          scrollPaddingBottom: "250px", // Adjust as needed based on MessageInput height
        }}
      >
        <LogsList
          logs={logs}
          components={{
            action_call: ({ log, getLog }) => {
              const result = getLog<ActionResult>(
                (t) => t.ref === "action_result" && t.callId === log.id
              );

              if (log.name.startsWith("gigaverse")) {
                return (
                  <GigaverseAction
                    key={log.id}
                    call={log}
                    result={result}
                    gameData={ctxState.data?.options.game}
                  />
                );
              }

              return null;
            },
          }}
        />
      </div>

      <div className="bg-background flex mt-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              disabled={send.isPending}
              onClick={() => setShowTemplateEditor(true)}
              className="h-full flex text-muted-foreground"
            >
              <ScrollText />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Instructions</p>
          </TooltipContent>
        </Tooltip>
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

import {
  createFileRoute,
  ErrorComponent,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
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
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { usePriceStore } from "@/store/priceStore";

const searchParams = z.object({
  sidebar: z
    .enum(["overview", "skills", "inventory", "roms"])
    .optional()
    .default("overview"),
});

export const Route = createFileRoute("/games/gigaverse/$chatId")({
  validateSearch: zodValidator(searchParams),
  component: RouteComponent,
  context({ params }) {
    return {
      sidebar: <GigaverSidebarWrapper chatId={params.chatId} />,
    };
  },
  loader({ params }) {
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

function GigaverSidebarWrapper({ chatId }: { chatId: string }) {
  return (
    <Sidebar
      collapsible="none"
      className={cn("w-96 border-l min-h-svh max-h-svh md:shrink-0 h-full")}
      side="right"
    >
      <SidebarContent className="bg-sidebar">
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }: any) => (
            <GigaverseSidebarErrorComponent
              chatId={chatId}
              error={error}
              resetErrorBoundary={resetErrorBoundary}
            />
          )}
        >
          <GigaverseSidebar args={{ id: chatId }} />
        </ErrorBoundary>
      </SidebarContent>
    </Sidebar>
  );
}

function GigaverseSidebarErrorComponent({
  chatId,
  error,
  resetErrorBoundary,
}: FallbackProps & {
  chatId: string;
}) {
  // throw new Error("failed");
  const router = useRouter();
  const { agent } = useAgentStore();
  const contextId = agent.getContextId({
    context: gigaverseContext,
    args: { id: chatId },
  });

  return (
    <div className="p-2">
      <div>Gigaverse Sidebar failed to load.</div>
      <Button
        onClick={async () => {
          await agent.deleteContext(contextId);
          await router.invalidate();

          resetErrorBoundary();
        }}
      >
        Reset Memory
      </Button>
      <ErrorComponent error={error} />
    </div>
  );
}

function RouteComponent() {
  const { chatId } = Route.useParams();

  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const agent = useAgentStore((state) => state.agent);

  const showHelpWindow = useSettingsStore((state) => state.showHelpWindow);
  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );

  const { fetchExchangeRate } = usePriceStore();

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    const hasGigaverseToken = hasApiKey("gigaverseToken");

    const missing: string[] = [];
    if (!hasOpenRouterKey) missing.push("OpenRouter");
    if (!hasGigaverseToken) missing.push("Gigaverse");

    setMissingKeys(missing);
  }, []);

  const { logs } = useLogs({
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
        <div className="bg-accent/20 p-3 text-accent-foreground text-sm flex justify-between items-center">
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
          scrollPaddingBottom: "250px",
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
          disabled={ctxState.error !== null || missingKeys.length > 0}
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

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
import { LogsList } from "@/components/chat/LogsLIst";
import { ScrollText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { PonziLandSidebar } from "@/games/ponziland/components/Sidebar";
import { ponziland } from "@/games/ponziland/ponziland";
import { TemplateEditorDialog } from "@/components/chat/template-editor-dialog";
import { defaultInstructions, defaultRules } from "@/games/gigaverse/prompts";
import { templates } from "@/games/ponziland/templates";

export const Route = createFileRoute("/games/ponziland/$chatId")({
  component: RouteComponent,
  context({ params }) {
    return {
      sidebar: <PonziLandSidebarWrapper chatId={params.chatId} />,
    };
  },
  loader({ params }) {
    // Check if user has required API keys
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    const hasCartridgeAccount = hasApiKey("cartridgeAccount");

    // If neither key is available, redirect to settings
    if (!hasOpenRouterKey && !hasCartridgeAccount) {
      throw redirect({
        to: "/settings",
      });
    }

    // Handle "new" chat redirect
    if (params.chatId === "new") {
      throw redirect({
        to: "/games/ponziland/$chatId",
        params: {
          chatId: randomUUIDv7(),
        },
      });
    }
  },
});

function PonziLandSidebarWrapper({ chatId }: { chatId: string }) {
  return (
    <Sidebar
      collapsible="none"
      className={cn("w-96 border-l min-h-svh max-h-svh md:shrink-0 h-full")}
      side="right"
    >
      <SidebarContent className="bg-sidebar">
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }: any) => (
            <SidebarErrorComponent
              chatId={chatId}
              error={error}
              resetErrorBoundary={resetErrorBoundary}
            />
          )}
        >
          <PonziLandSidebar args={{ id: chatId }} />
        </ErrorBoundary>
      </SidebarContent>
    </Sidebar>
  );
}

function SidebarErrorComponent({
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
    context: ponziland,
    args: { id: chatId },
  });

  return (
    <div className="p-2">
      <div>Game Sidebar failed to load.</div>
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

  useEffect(() => {
    const hasOpenRouterKey = hasApiKey("openrouterKey");

    const missing: string[] = [];
    if (!hasOpenRouterKey) missing.push("OpenRouter");

    setMissingKeys(missing);
  }, []);

  const { logs } = useLogs({
    agent: agent,
    context: ponziland,
    args: { id: chatId },
  });

  const { send, abortControllerRef } = useSend({
    agent: agent,
    context: ponziland,
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
    context: ponziland,
    args: { id: chatId },
  });

  return (
    <>
      <HelpWindow open={showHelpWindow} onOpenChange={setShowHelpWindow} />
      <TemplateEditorDialog
        open={showTemplateEditor}
        title="Ponziland Instructions"
        variables={[]}
        templateKey="ponziland"
        sections={{
          instructions: {
            label: "Ponziland Strategy",
            default: {
              id: "ponziland-instructions-default",
              title: "Default",
              section: "instructions",
              prompt: templates.instructions,
              tags: ["default"],
            },
          },
          rules: {
            label: "Ponziland Rules",
            default: {
              id: "ponziland-rules-default",
              title: "Default",
              section: "rules",
              prompt: templates.rules,
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
          scrollPaddingBottom: "250px",
        }}
      >
        <LogsList
          logs={logs}
          components={
            {
              // action_call: ({ log, getLog }) => {
              //   const result = getLog<ActionResult>(
              //     (t) => t.ref === "action_result" && t.callId === log.id
              //   );
              //   return null;
              // },
            }
          }
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

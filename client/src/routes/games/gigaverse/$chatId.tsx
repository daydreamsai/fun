import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { v7 as randomUUIDv7 } from "uuid";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { Button } from "@/components/ui/button";

import { hasApiKey, useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useTemplateStore } from "@/store/templateStore";

import { HelpWindow, MessageInput } from "@/components/chat";
import { gigaverseContext, gigaverseVariables } from "@/agent/giga";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogs, useSend } from "@/hooks/agent";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { GigaverseStateSidebar } from "@/components/gigaverse/StateSidebar";
import { ActionResult } from "@daydreamsai/core";
import { GigaverseAction } from "@/components/gigaverse/Actions";
import { LogsList } from "@/components/chat/LogsLIst";
import { TemplateEditorDialog } from "@/components/chat/template-editor-dialog";

function GigaverSidebar({
  chatId,
  clearMemory,
}: {
  chatId: string;
  clearMemory: () => void;
}) {
  return (
    <Sidebar
      collapsible="none"
      className={cn(
        "sticky hidden lg:flex w-96 top-0 min-h-svh max-h-svh border-l shrink-0 h-full"
      )}
      side="right"
    >
      <SidebarContent className="bg-sidebar">
        <GigaverseStateSidebar
          args={{ id: chatId }}
          isLoading={false}
          clearMemory={clearMemory}
        />
      </SidebarContent>
    </Sidebar>
  );
}

export const Route = createFileRoute("/games/gigaverse/$chatId")({
  component: RouteComponent,
  loader({ params }: { params: { chatId: string } }) {
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

  const agent = useAgentStore((state) => state.agent);
  const showHelpWindow = useSettingsStore((state) => state.showHelpWindow);
  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );

  const agentRef = useRef(agent);

  const { template, setTemplate, resetTemplate } = useTemplateStore();

  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);

  useEffect(() => {
    const hasOpenRouterKey = hasApiKey("openrouterKey");
    const hasGigaverseToken = hasApiKey("gigaverseToken");

    const missing: string[] = [];
    if (!hasOpenRouterKey) missing.push("OpenRouter");
    if (!hasGigaverseToken) missing.push("Gigaverse");

    setMissingKeys(missing);
  }, []);

  const { logs, clearMemory } = useLogs({
    agent: agentRef.current,
    context: gigaverseContext,
    args: { id: chatId },
  });

  const { send } = useSend({
    agent: agentRef.current,
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

  const handleApplyTemplate = (newTemplate: string) => {
    setTemplate(newTemplate);
  };

  const handleResetTemplate = () => {
    resetTemplate();
  };

  const thoughts = logs.filter((log) => log.ref === "thought");

  const messagesContainerRef = useAutoScroll([logs], {
    threshold: 150,
    behavior: "auto",
  });

  return (
    <>
      <HelpWindow open={showHelpWindow} onOpenChange={setShowHelpWindow} />
      <TemplateEditorDialog
        open={showTemplateEditor}
        onOpenChange={setShowTemplateEditor}
        title="Agent Prompt Template"
        requiredVariables={gigaverseVariables}
        initialTemplate={template}
        onApplyTemplate={handleApplyTemplate}
        onResetTemplate={handleResetTemplate}
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

      {/* Main container: flex-col by default, lg:flex-row for larger screens */}
      {/* Messages container: takes full width on small screens, allows space for sidebar on large screens */}
      <div className="flex flex-row h-full">
        <div
          className="flex flex-col flex-1 overflow-y-scroll pb-80 px-6 mr-0.5"
          ref={messagesContainerRef}
          style={{
            scrollBehavior: "smooth",
            scrollPaddingBottom: "250px", // Adjust as needed based on MessageInput height
          }}
        >
          {/* Content within messages container: centered with max-width */}
          <div className="pt-4 w-full max-w-4xl">
            {/* Agent Thoughts Section */}
            {thoughts.length > 0 && (
              <Card className="mb-2 max-h-[250px] min-h-[250px] overflow-y-auto border-primary">
                <CardHeader>
                  <CardTitle>Agent Thoughts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div key={thoughts[thoughts.length - 1].id}>
                    {thoughts[thoughts.length - 1].content}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <LogsList
            logs={logs}
            components={{
              action_call: ({ log, getLog }) => {
                const result = getLog<ActionResult>(
                  (t) => t.ref === "action_result" && t.callId === log.id
                );

                if (log.name.startsWith("gigaverse")) {
                  return (
                    <GigaverseAction key={log.id} call={log} result={result} />
                  );
                }

                return null;
              },
            }}
          />
        </div>
        <GigaverSidebar
          chatId={chatId}
          clearMemory={() =>
            clearMemory("working-memory:gigaverse:gigaverse-1")
          }
        />
      </div>

      <MessageInput
        isLoading={send.isPending}
        disabled={missingKeys.length === 2}
        onSubmit={handleSubmitMessage}
        setShowTemplateEditor={setShowTemplateEditor}
        placeholderText={
          missingKeys.length === 2
            ? "Please set up API keys in settings to start chatting"
            : undefined
        }
      />
    </>
  );
}

import {
  createFileRoute,
  ErrorComponent,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { v7 as randomUUIDv7 } from "uuid";
import { Button } from "@/components/ui/button";
import { hasApiKey, useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { HelpWindow } from "@/components/chat";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { gigaverseContext } from "@/games/gigaverse/context";
import { GigaverseSidebar } from "@/games/gigaverse/components/Sidebar";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { usePriceStore } from "@/store/priceStore";

const searchParams = z.object({
  sidebar: z
    .enum(["play", "skills", "inventory", "market", "roms"])
    .optional()
    .default("play"),
});

export const Route = createFileRoute("/games/gigaverse/$chatId")({
  validateSearch: zodValidator(searchParams),
  component: RouteComponent,
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

  return (
    <>
      <HelpWindow open={showHelpWindow} onOpenChange={setShowHelpWindow} />
      
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
      
      {/* Main Gigaverse Content Area with Side Panel */}
      <div className="flex flex-1 min-h-0">
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <GigaverseSidebarErrorComponent
              chatId={chatId}
              error={error}
              resetErrorBoundary={resetErrorBoundary}
            />
          )}
        >
          <GigaverseSidebar args={{ id: chatId }} />
        </ErrorBoundary>
      </div>
    </>
  );
}

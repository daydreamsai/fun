import { useEffect } from "react";
import { InferSchemaArguments, prepareContexts } from "@daydreamsai/core";
import { Trash, ShieldQuestion, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GigaverseContext, gigaverseContext } from "../context";
import { OverviewTab } from "@/games/gigaverse/components/OverviewTab";
import { useContextState } from "@/hooks/agent";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RomsTab } from "./RomsTab";
import { MemoryTab } from "./MemoryTab";
import { InventoryTab } from "./InventoryTab";
import { SkillsTab } from "./SkillsTab";
import { ErrorComponent, Link, useSearch } from "@tanstack/react-router";
import { GigaverseAuth } from "../settings";
import { useNavigate } from "@tanstack/react-router";

export const getAbstractAddress = () =>
  useSettingsStore.getState().abstractAddress;

export function GigaverseSidebar({
  args,
}: {
  args: InferSchemaArguments<GigaverseContext["schema"]>;
}) {
  const { sidebar: tab } = useSearch({ from: "/games/gigaverse/$chatId" });

  const navigate = useNavigate({ from: "/games/gigaverse/$chatId" });

  const agent = useAgentStore((state) => state.agent);
  const contextId = agent.getContextId({ context: gigaverseContext, args });

  const stateQuery = useQuery({
    enabled: false,
    queryKey: ["gigaverse", contextId],
    queryFn: async () => {
      const ctxState = await agent.getContext({
        context: gigaverseContext,
        args,
      });

      const workingMemory = await agent.getWorkingMemory(ctxState.id);

      const res = await prepareContexts({
        agent,
        ctxState,
        workingMemory,
      });

      return res;
    },
  });

  const gigaverseState = useContextState({
    agent,
    context: gigaverseContext,
    args,
  });

  useEffect(() => {
    return agent.subscribeContext(contextId, (log, done) => {
      if (!done) return;
      switch (log.ref) {
        case "step": {
          gigaverseState.refetch();
          break;
        }
        case "action_result": {
          if (log.name.startsWith("gigaverse")) {
            gigaverseState.refetch();
          }
          break;
        }
      }
    });
  }, [contextId]);

  const queryClient = useQueryClient();
  const abstractAddress = getAbstractAddress();

  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );

  return (
    <div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground"
          onClick={() => setShowHelpWindow(true)}
        >
          <ShieldQuestion /> Help
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground"
          asChild
        >
          <Link to="/settings">
            <Settings /> Settings
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground"
          onClick={async () => {
            await agent.deleteContext(contextId);
            await queryClient.invalidateQueries({
              type: "active",
              exact: false,
              predicate(query: any) {
                try {
                  return query.queryKey[1] === contextId;
                } catch (error) {
                  return false;
                }
              },
            });
          }}
        >
          <Trash /> Clear Memory
        </Button>
      </div>

      <img src="/giga.jpeg" alt="Giga Banner" className="border-b" />

      {gigaverseState.isLoading ? (
        <div className="p-4 m-2 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading game state...</p>
          </div>
        </div>
      ) : gigaverseState.error ? (
        <>
          <div className="p-2 border border-destructive m-2">
            <ErrorComponent error={gigaverseState.error}></ErrorComponent>
          </div>
          <div className="p-2 mt-2">
            <GigaverseAuth />
          </div>
        </>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(v) => {
            navigate({
              search: {
                sidebar: v as "overview" | "skills" | "inventory" | "roms",
              },
            });
          }}
        >
          <TabsList className="w-full justify-between">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="roms">ROMS</TabsTrigger>
            {/* <TabsTrigger value="memory">Memory</TabsTrigger> */}
          </TabsList>

          <TabsContent
            value="overview"
            className="flex-1 overflow-y-auto px-2 border-primary/20"
          >
            <OverviewTab
              state={gigaverseState.data}
              lastUpdated={gigaverseState.dataUpdatedAt}
              refresh={async () => {
                await stateQuery.refetch();
                await gigaverseState.refetch();
              }}
            />
          </TabsContent>

          <TabsContent value="inventory" className="px-2">
            {gigaverseState.data && (
              <InventoryTab state={gigaverseState.data} />
            )}
          </TabsContent>

          <TabsContent value="roms">
            {gigaverseState.data && (
              <RomsTab
                address={abstractAddress}
                gameClient={gigaverseState.data?.options.client}
              />
            )}
          </TabsContent>

          <TabsContent value="skills" className="px-2">
            {gigaverseState.data && <SkillsTab state={gigaverseState.data} />}
          </TabsContent>

          <TabsContent value="memory" className="px-2">
            <MemoryTab agent={agent} args={args} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

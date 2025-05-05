import { useEffect } from "react";
import {
  formatContextState,
  formatXml,
  InferSchemaArguments,
  prepareContexts,
} from "@daydreamsai/core";
import { Trash, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAbstractAddress,
  GigaverseContext,
  gigaverseContext,
} from "../context";
import { OverviewTab } from "@/games/gigaverse/components/OverviewTab";
import { useContextState } from "@/hooks/agent";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RomsTab } from "./RomsTab";
import { MemoryTab } from "./MemoryTab";
import { InventoryTab } from "./InventoryTab";

export function GigaverseSidebar({
  args,
}: {
  args: InferSchemaArguments<GigaverseContext["schema"]>;
}) {
  const agent = useAgentStore((state) => state.agent);
  const contextId = agent.getContextId({ context: gigaverseContext, args });

  const stateQuery = useQuery({
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

  // if (isCollapsed) {
  // const [isCollapsed, setIsCollapsed] = useState(false);
  //   return (
  //     <div className="border-l bg-background/95 backdrop-blur flex flex-col items-center py-4 h-full">
  //       <Button
  //         variant="ghost"
  //         size="icon"
  //         onClick={() => setIsCollapsed(false)}
  //         className="mb-4"
  //       >
  //         <ChevronLeft className="h-4 w-4" />
  //       </Button>
  //       <Cpu className="h-5 w-5 my-2 text-muted-foreground" />
  //       <Eye className="h-5 w-5 my-2 text-muted-foreground" />
  //       <Settings className="h-5 w-5 my-2 text-muted-foreground" />
  //     </div>
  //   );
  // }
  console.log(
    gigaverseState.data
      ? formatXml(formatContextState(gigaverseState.data))
      : ""
  );

  console.log(gigaverseState.data ? gigaverseState.data.options.game : {});

  return (
    <div>
      <div className="flex">
        <Button
          variant="outline"
          className="w-full text-muted-foreground"
          onClick={() => setShowHelpWindow(true)}
        >
          Help <ShieldQuestion />
        </Button>
        <Button
          variant="outline"
          className="w-full text-muted-foreground"
          onClick={async () => {
            await agent.deleteContext(contextId);
            await queryClient.invalidateQueries({
              type: "active",
              exact: false,
              predicate(query) {
                try {
                  return query.queryKey[1] === contextId;
                } catch (error) {
                  return false;
                }
              },
            });
          }}
        >
          Clear Memory <Trash />
        </Button>
      </div>
      <img src="/giga.jpeg" alt="Giga Banner" />

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-between">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="roms">ROMS</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
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
          {gigaverseState.data && <InventoryTab state={gigaverseState.data} />}
        </TabsContent>

        <TabsContent value="roms">
          {gigaverseState.data && (
            <RomsTab
              address={abstractAddress}
              gameClient={gigaverseState.data?.options.client}
            />
          )}
        </TabsContent>

        <TabsContent value="memory" className="px-2">
          <MemoryTab agent={agent} args={args} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { InferSchemaArguments, prepareContexts } from "@daydreamsai/core";
import { Trash, ShieldQuestion, Settings, RefreshCw } from "lucide-react";
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

  const queryClient = useQueryClient();

  // ULTRA-ROBUST SOLUTION: Force synchronization after every agent action
  useEffect(() => {
    const unsubscribe = agent.subscribeContext(contextId, async (log, done) => {
      // When a Gigaverse action completes, FORCE a full refresh
      if (done && log.data?.actionName?.startsWith("gigaverse.")) {
        console.log("🎯 GIGAVERSE ACTION DETECTED - FORCING FULL SYNC:", {
          actionName: log.data.actionName,
          logRef: log.ref,
          timestamp: new Date(log.timestamp).toLocaleTimeString()
        });
        
        // Strategy 1: Invalidate React Query cache
        queryClient.invalidateQueries({
          queryKey: ["context", contextId],
        });
        
        // Strategy 2: Force immediate refetch
        setTimeout(() => {
          console.log("🔄 FORCING IMMEDIATE REFETCH");
          gigaverseState.refetch();
        }, 200);
        
        // Strategy 3: Fallback polling for 10 seconds to ensure sync
        let attempts = 0;
        const maxAttempts = 5;
        const syncCheck = setInterval(() => {
          attempts++;
          console.log(`🔍 SYNC CHECK ${attempts}/${maxAttempts}`);
          
          gigaverseState.refetch();
          
          // Stop after max attempts or when we get dungeon data
          if (attempts >= maxAttempts || gigaverseState.data?.dungeon) {
            clearInterval(syncCheck);
            if (gigaverseState.data?.dungeon) {
              console.log("✅ SYNC SUCCESSFUL - Dungeon data found!");
            } else {
              console.log("⚠️ SYNC TIMEOUT - Dungeon data still missing after 5 attempts");
            }
          }
        }, 2000);
      }
    });

    return unsubscribe;
  }, [agent, contextId, queryClient, gigaverseState.refetch]);

  // DEBUG: Massive logging to understand the state
  useEffect(() => {
    console.log("🔍 GIGAVERSE STATE DEBUG:", {
      hasData: !!gigaverseState.data,
      dataKeys: gigaverseState.data ? Object.keys(gigaverseState.data) : [],
      hasDungeon: !!gigaverseState.data?.dungeon,
      dungeonKeys: gigaverseState.data?.dungeon ? Object.keys(gigaverseState.data.dungeon) : [],
      hasPlayer: !!gigaverseState.data?.dungeon?.player,
      playerKeys: gigaverseState.data?.dungeon?.player ? Object.keys(gigaverseState.data.dungeon.player) : [],
      hasPlayerHealth: !!gigaverseState.data?.dungeon?.player?.health,
      playerHealthCurrent: gigaverseState.data?.dungeon?.player?.health?.current,
      playerHealthMax: gigaverseState.data?.dungeon?.player?.health?.currentMax,
      currentRoom: gigaverseState.data?.dungeon?.currentRoom,
      isLoading: gigaverseState.isLoading,
      isRefetching: gigaverseState.isRefetching,
      error: gigaverseState.error?.message,
      dataUpdatedAt: new Date(gigaverseState.dataUpdatedAt || 0).toLocaleTimeString(),
      fullDungeon: gigaverseState.data?.dungeon
    });
  }, [gigaverseState.data, gigaverseState.dataUpdatedAt, gigaverseState.isLoading]);

  // BACKUP SOLUTION: Continuous polling when we detect we're supposed to be in a dungeon
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Start continuous polling if we suspect we should have dungeon data but don't
    const shouldHaveDungeonData = gigaverseState.data && !gigaverseState.data.dungeon && !gigaverseState.isLoading;
    const hasActiveDungeon = gigaverseState.data?.dungeon?.player?.health?.current > 0;
    
    if (shouldHaveDungeonData || hasActiveDungeon) {
      console.log("🔄 STARTING CONTINUOUS SYNC POLLING:", {
        reason: shouldHaveDungeonData ? "Missing expected dungeon data" : "Active dungeon detected",
        hasData: !!gigaverseState.data,
        hasDungeon: !!gigaverseState.data?.dungeon,
        isLoading: gigaverseState.isLoading
      });
      
      intervalId = setInterval(() => {
        console.log("⏰ Continuous sync refresh");
        gigaverseState.refetch();
      }, 1500); // More frequent polling when syncing
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log("🛑 Stopped continuous sync polling");
      }
    };
  }, [
    gigaverseState.data?.dungeon, // When dungeon data changes
    gigaverseState.isLoading, // When loading state changes
    gigaverseState.dataUpdatedAt // When data updates
  ]);

  const forceRefresh = () => {
    console.log("🔄 MANUAL REFRESH triggered");
    gigaverseState.refetch().then(() => {
      console.log("✅ MANUAL REFRESH completed", {
        dataUpdated: gigaverseState.dataUpdatedAt,
        hasData: !!gigaverseState.data,
        playerHealth: gigaverseState.data?.dungeon?.player?.health?.current,
        enemyHealth: gigaverseState.data?.dungeon?.enemy?.health?.current,
        room: gigaverseState.data?.dungeon?.currentRoom
      });
    });
  };

  // Log when gigaverseState changes
  useEffect(() => {
    console.log("📊 GIGAVERSE STATE CHANGED:", {
      isLoading: gigaverseState.isLoading,
      isRefetching: gigaverseState.isRefetching,
      dataUpdatedAt: new Date(gigaverseState.dataUpdatedAt || 0).toLocaleTimeString(),
      hasData: !!gigaverseState.data,
      hasDungeon: !!gigaverseState.data?.dungeon,
      playerHealth: gigaverseState.data?.dungeon?.player?.health?.current,
      enemyHealth: gigaverseState.data?.dungeon?.enemy?.health?.current,
      room: gigaverseState.data?.dungeon?.currentRoom,
      lastBattleResult: gigaverseState.data?.dungeon?.lastBattleResult
    });
  }, [gigaverseState.dataUpdatedAt, gigaverseState.data]);

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
          <ShieldQuestion className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground"
          asChild
        >
          <Link to="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground"
          onClick={forceRefresh}
          disabled={gigaverseState.isRefetching}
        >
          <RefreshCw className={`h-4 w-4 ${gigaverseState.isRefetching ? 'animate-spin' : ''}`} />
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
          <Trash className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Simple status indicator */}
      <div className="px-2 py-1 text-xs text-muted-foreground bg-muted/50">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${gigaverseState.isRefetching ? 'bg-yellow-500 animate-pulse' : gigaverseState.isError ? 'bg-red-500' : 'bg-green-500'}`} />
            Status: {gigaverseState.isRefetching ? 'Updating...' : gigaverseState.isError ? 'Error' : 'Ready'}
          </span>
          <span>
            Last update: {new Date(gigaverseState.dataUpdatedAt || 0).toLocaleTimeString()}
          </span>
        </div>
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
          <TabsList className="w-full justify-between uppercase text-xs">
            <TabsTrigger value="overview">OVERVIEW</TabsTrigger>
            <TabsTrigger value="skills">SKILLS</TabsTrigger>
            <TabsTrigger value="inventory">INVENTORY</TabsTrigger>
            <TabsTrigger value="roms">ROMS</TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="flex-1 overflow-y-auto px-2 border-primary/20"
          >
            <OverviewTab
              state={gigaverseState.data}
              lastUpdated={gigaverseState.dataUpdatedAt}
              refresh={forceRefresh}
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

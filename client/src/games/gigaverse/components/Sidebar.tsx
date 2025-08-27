import { useEffect, useRef } from "react";
import { InferSchemaArguments, prepareContexts } from "@daydreamsai/core";
import { Trash, ShieldQuestion, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GigaverseContext, gigaverseContext } from "../context";
import { OverviewTab } from "@/games/gigaverse/components/OverviewTab";
import { DungeonState } from "./Dungeons";
import { useContextState } from "@/hooks/agent";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RomsTab } from "./RomsTab";
import { MemoryTab } from "./MemoryTab";
import { InventoryTab } from "./InventoryTab";
import { SkillsTab } from "./SkillsTab";
import { MarketTab } from "./MarketTab";
import { ChatTab } from "./ChatTab";
import { ErrorComponent, Link, useSearch } from "@tanstack/react-router";
import { GigaverseAuth } from "../settings";
import { useNavigate } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";

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


  // BACKUP SOLUTION: Continuous polling when we detect we're supposed to be in a dungeon
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Start continuous polling if we suspect we should have dungeon data but don't
    const shouldHaveDungeonData = gigaverseState.data && !gigaverseState.data.dungeon && !gigaverseState.isLoading;
    const hasActiveDungeon = gigaverseState.data?.dungeon?.player?.health?.current > 0;
    
    if (shouldHaveDungeonData || hasActiveDungeon) {
      // console.log("🔄 STARTING CONTINUOUS SYNC POLLING:", {
      //   reason: shouldHaveDungeonData ? "Missing expected dungeon data" : "Active dungeon detected",
      //   hasData: !!gigaverseState.data,
      //   hasDungeon: !!gigaverseState.data?.dungeon,
      //   isLoading: gigaverseState.isLoading
      // });
      
      intervalId = setInterval(() => {
        // console.log("⏰ Continuous sync refresh");
        gigaverseState.refetch();
      }, 1500); // More frequent polling when syncing
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        // console.log("🛑 Stopped continuous sync polling");
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
  // useEffect(() => {
  //   console.log("📊 GIGAVERSE STATE CHANGED:", {
  //     isLoading: gigaverseState.isLoading,
  //     isRefetching: gigaverseState.isRefetching,
  //     dataUpdatedAt: new Date(gigaverseState.dataUpdatedAt || 0).toLocaleTimeString(),
  //     hasData: !!gigaverseState.data,
  //     hasDungeon: !!gigaverseState.data?.dungeon,
  //     playerHealth: gigaverseState.data?.dungeon?.player?.health?.current,
  //     enemyHealth: gigaverseState.data?.dungeon?.enemy?.health?.current,
  //     room: gigaverseState.data?.dungeon?.currentRoom,
  //     lastBattleResult: gigaverseState.data?.dungeon?.lastBattleResult
  //   });
  // }, [gigaverseState.dataUpdatedAt, gigaverseState.data]);

  const abstractAddress = getAbstractAddress();

  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );

  return (
    <div className="flex h-full w-full">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 max-w-[calc(100vw-320px)]">
        {/* Header with controls */}
        <div className="flex items-center gap-4 p-4 border-b">
          <img src="/giga.jpeg" alt="Giga Banner" className="h-12 w-12 rounded" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Gigaverse</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${gigaverseState.isRefetching ? 'bg-yellow-500 animate-pulse' : gigaverseState.isError ? 'bg-red-500' : 'bg-green-500'}`} />
              {gigaverseState.isRefetching ? 'Updating...' : gigaverseState.isError ? 'Error' : 'Ready'}
              <span className="ml-2">Last update: {new Date(gigaverseState.dataUpdatedAt || 0).toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelpWindow(true)}
            >
              <ShieldQuestion className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link to="/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={forceRefresh}
              disabled={gigaverseState.isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${gigaverseState.isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
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
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {gigaverseState.isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading game state...</p>
              </div>
            </div>
          ) : gigaverseState.error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md w-full space-y-4">
                <div className="p-4 border border-destructive rounded-md">
                  <ErrorComponent error={gigaverseState.error}></ErrorComponent>
                </div>
                <GigaverseAuth />
              </div>
            </div>
          ) : (
            <Tabs
              value={tab === "chat" ? "play" : tab}
              onValueChange={(v) => {
                navigate({
                  search: {
                    sidebar: v as "play" | "skills" | "inventory" | "market" | "roms",
                  },
                });
              }}
              className="flex-1 flex flex-col"
            >
              <div className="px-4 py-2 border-b">
                <TabsList className="w-full max-w-lg grid-cols-5">
                  <TabsTrigger value="play" className="flex-1">PLAY</TabsTrigger>
                  <TabsTrigger value="skills" className="flex-1">SKILLS</TabsTrigger>
                  <TabsTrigger value="inventory" className="flex-1">INVENTORY</TabsTrigger>
                  <TabsTrigger value="market" className="flex-1">MARKET</TabsTrigger>
                  <TabsTrigger value="roms" className="flex-1">ROMS</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0">
                <TabsContent value="play" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    <OverviewTab
                      state={gigaverseState.data}
                      lastUpdated={gigaverseState.dataUpdatedAt}
                      refresh={forceRefresh}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="h-full p-4 data-[state=active]:block">
                  <div className="h-full">
                    {gigaverseState.data && (
                      <InventoryTab state={gigaverseState.data} />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="market" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {gigaverseState.data && (
                      <MarketTab state={gigaverseState.data} />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="roms" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {gigaverseState.data && (
                      <RomsTab
                        address={abstractAddress}
                        gameClient={gigaverseState.data?.options.client}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="skills" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {gigaverseState.data && <SkillsTab state={gigaverseState.data} />}
                  </div>
                </TabsContent>

                <TabsContent value="memory" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    <MemoryTab agent={agent} args={args} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>

      {/* Right Side Panel - Fixed Width Always Visible */}
      <div className="w-80 flex-shrink-0 border-l bg-background/95 backdrop-blur flex flex-col h-full">
        {/* Dungeon State - Always Visible */}
        {gigaverseState.data?.memory?.dungeon ? (
          <>
            {/* Dungeon Header */}
            <div className="bg-secondary/50">
              <h5 className="text-xs font-medium py-1 text-center uppercase">Dungeon</h5>
            </div>
            
            {/* Room and Enemy Info */}
            <div className="bg-card/50 border-b">
              <div className="grid grid-cols-2 text-center py-2 px-2">
                <div className="border-r">
                  <div className="text-xs text-muted-foreground uppercase">Room</div>
                  <div className="text-lg">{gigaverseState.data.memory.dungeon.currentRoom}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Enemy</div>
                  <div className="text-sm">{gigaverseState.data.options.game.offchain.enemies[gigaverseState.data.memory.dungeon.currentRoom].NAME_CID}</div>
                </div>
              </div>
            </div>
            
            {/* Player and Enemy Status */}
            <div className="bg-secondary/50">
              <h5 className="text-xs font-medium py-1 text-center uppercase">Player Status</h5>
            </div>
            <div className="bg-card/50 border-b">
              <div className="grid grid-cols-2">
                {/* Player Status */}
                <div className="p-2 border-r">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Player</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>HP:</span>
                      <span className="font-medium">{gigaverseState.data.memory.dungeon.player.health.current}/{gigaverseState.data.memory.dungeon.player.health.currentMax}</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${(gigaverseState.data.memory.dungeon.player.health.current / gigaverseState.data.memory.dungeon.player.health.currentMax) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Shield:</span>
                      <span className="font-medium">{gigaverseState.data.memory.dungeon.player.shield.current}/{gigaverseState.data.memory.dungeon.player.shield.currentMax}</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${(gigaverseState.data.memory.dungeon.player.shield.current / gigaverseState.data.memory.dungeon.player.shield.currentMax) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Enemy Status */}
                <div className="p-2">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Enemy</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>HP:</span>
                      <span className="font-medium">{gigaverseState.data.memory.dungeon.enemy.health.current}/{gigaverseState.data.memory.dungeon.enemy.health.currentMax}</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500"
                        style={{ width: `${(gigaverseState.data.memory.dungeon.enemy.health.current / gigaverseState.data.memory.dungeon.enemy.health.currentMax) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Shield:</span>
                      <span className="font-medium">{gigaverseState.data.memory.dungeon.enemy.shield.current}/{gigaverseState.data.memory.dungeon.enemy.shield.currentMax}</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${(gigaverseState.data.memory.dungeon.enemy.shield.current / gigaverseState.data.memory.dungeon.enemy.shield.currentMax) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weapons Section */}
            <div className="bg-secondary/50">
              <h5 className="text-xs font-medium py-1 text-center uppercase">Weapons Status</h5>
            </div>
            <div className="bg-card/50 border-b">
              <div className="grid grid-cols-2">
                {/* Player Weapons */}
                <div className="p-2 border-r">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Player</div>
                  <div className="space-y-1">
                    {/* Rock/Sword */}
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.player.rock.currentATK}</span>
                        <span className="text-sm">⚔️</span>
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.player.rock.currentDEF}</span>
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 3 }, (_, i) => {
                          const chargeIndex = i + 1;
                          const charges = gigaverseState.data.memory.dungeon.player.rock.currentCharges;
                          let bgColor = "bg-gray-600";
                          if (charges < 0 && chargeIndex <= Math.abs(charges)) {
                            bgColor = "bg-red-500";
                          } else if (charges > 0 && chargeIndex <= charges) {
                            bgColor = "bg-green-500";
                          }
                          return <div key={i} className={`h-1 flex-1 ${bgColor}`} />;
                        })}
                      </div>
                    </div>
                    
                    {/* Paper/Shield */}
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.player.paper.currentATK}</span>
                        <span className="text-sm">🛡️</span>
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.player.paper.currentDEF}</span>
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 3 }, (_, i) => {
                          const chargeIndex = i + 1;
                          const charges = gigaverseState.data.memory.dungeon.player.paper.currentCharges;
                          let bgColor = "bg-gray-600";
                          if (charges < 0 && chargeIndex <= Math.abs(charges)) {
                            bgColor = "bg-red-500";
                          } else if (charges > 0 && chargeIndex <= charges) {
                            bgColor = "bg-green-500";
                          }
                          return <div key={i} className={`h-1 flex-1 ${bgColor}`} />;
                        })}
                      </div>
                    </div>
                    
                    {/* Scissor/Magic */}
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.player.scissor.currentATK}</span>
                        <span className="text-sm">✨</span>
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.player.scissor.currentDEF}</span>
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 3 }, (_, i) => {
                          const chargeIndex = i + 1;
                          const charges = gigaverseState.data.memory.dungeon.player.scissor.currentCharges;
                          let bgColor = "bg-gray-600";
                          if (charges < 0 && chargeIndex <= Math.abs(charges)) {
                            bgColor = "bg-red-500";
                          } else if (charges > 0 && chargeIndex <= charges) {
                            bgColor = "bg-green-500";
                          }
                          return <div key={i} className={`h-1 flex-1 ${bgColor}`} />;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enemy Weapons */}
                <div className="p-2">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Enemy</div>
                  <div className="space-y-1">
                    {/* Rock/Sword */}
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.enemy.rock.currentATK}</span>
                        <span className="text-sm">⚔️</span>
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.enemy.rock.currentDEF}</span>
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 3 }, (_, i) => {
                          const chargeIndex = i + 1;
                          const charges = gigaverseState.data.memory.dungeon.enemy.rock.currentCharges;
                          let bgColor = "bg-gray-600";
                          if (charges < 0 && chargeIndex <= Math.abs(charges)) {
                            bgColor = "bg-red-500";
                          } else if (charges > 0 && chargeIndex <= charges) {
                            bgColor = "bg-green-500";
                          }
                          return <div key={i} className={`h-1 flex-1 ${bgColor}`} />;
                        })}
                      </div>
                    </div>
                    
                    {/* Paper/Shield */}
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.enemy.paper.currentATK}</span>
                        <span className="text-sm">🛡️</span>
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.enemy.paper.currentDEF}</span>
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 3 }, (_, i) => {
                          const chargeIndex = i + 1;
                          const charges = gigaverseState.data.memory.dungeon.enemy.paper.currentCharges;
                          let bgColor = "bg-gray-600";
                          if (charges < 0 && chargeIndex <= Math.abs(charges)) {
                            bgColor = "bg-red-500";
                          } else if (charges > 0 && chargeIndex <= charges) {
                            bgColor = "bg-green-500";
                          }
                          return <div key={i} className={`h-1 flex-1 ${bgColor}`} />;
                        })}
                      </div>
                    </div>
                    
                    {/* Scissor/Magic */}
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.enemy.scissor.currentATK}</span>
                        <span className="text-sm">✨</span>
                        <span className="font-medium">{gigaverseState.data.memory.dungeon.enemy.scissor.currentDEF}</span>
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 3 }, (_, i) => {
                          const chargeIndex = i + 1;
                          const charges = gigaverseState.data.memory.dungeon.enemy.scissor.currentCharges;
                          let bgColor = "bg-gray-600";
                          if (charges < 0 && chargeIndex <= Math.abs(charges)) {
                            bgColor = "bg-red-500";
                          } else if (charges > 0 && chargeIndex <= charges) {
                            bgColor = "bg-green-500";
                          }
                          return <div key={i} className={`h-1 flex-1 ${bgColor}`} />;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Last Move Status */}
            {gigaverseState.data.memory.dungeon.lastBattleResult && (
              <>
                <div className="bg-secondary/50">
                  <h5 className="text-xs font-medium py-1 text-center uppercase">Last Move Status</h5>
                </div>
                <div className="bg-card/50 border-b">
                  <div className="grid grid-cols-3 text-center py-2 px-2">
                    <div className="border-r">
                      <div className="text-xs text-muted-foreground uppercase">Player</div>
                      <div className="text-sm uppercase">{gigaverseState.data.memory.dungeon.player.lastMove}</div>
                    </div>
                    <div className="border-r">
                      <div className="text-xs text-muted-foreground uppercase">Result</div>
                      <div className="text-sm uppercase">{gigaverseState.data.memory.dungeon.lastBattleResult}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Enemy</div>
                      <div className="text-sm uppercase">{gigaverseState.data.memory.dungeon.enemy.lastMove}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="p-3 border-b flex-shrink-0">
            <div className="text-sm text-muted-foreground text-center">
              No active dungeon
            </div>
          </div>
        )}
        
        {/* Chat Area - Takes remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-secondary/50">
            <h5 className="text-xs font-medium py-1 text-center uppercase">Chat</h5>
          </div>
          <div className="flex-1 min-h-0">
            <ChatTab chatId={args.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  InferSchemaArguments,
  Logger,
  prepareContexts,
  saveContextWorkingMemory,
} from "@daydreamsai/core";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Code,
  Settings,
  Trash,
  Cpu,
  ShieldQuestion,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  getAbstractAddress,
  getApiBaseUrl,
  getGigaToken,
  GigaverseContext,
  gigaverseContext,
} from "../context";
import { GameStatus } from "@/games/gigaverse/components/GameStatus";
import { browserStorage } from "@/agent";
import { GameClient } from "../client/GameClient";
import { RomEntity } from "../client/types/responses";
import { useContextState, useWorkingMemory } from "@/hooks/agent";

import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const gameClient = new GameClient(
  getApiBaseUrl(),
  getGigaToken(),
  new Logger({})
);

export function GigaverseStateSidebar({
  args,
  isLoading,
  clearMemory,
}: {
  args: InferSchemaArguments<GigaverseContext["schema"]>;
  isLoading?: boolean;
  clearMemory: () => void;
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

  const workingMemory = useWorkingMemory({
    agent,
    context: gigaverseContext,
    args,
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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [showFullMemory, setShowFullMemory] = useState(false);

  // ROMS Tab State
  const [claimingStatus, setClaimingStatus] = useState<Record<string, boolean>>(
    {}
  );

  const queryClient = useQueryClient();

  const abstractAddress = getAbstractAddress();

  const romsQuery = useQuery({
    enabled: !!abstractAddress && activeTab === "roms",
    queryKey: ["gigaverse:roms", abstractAddress],
    queryFn: async () => {
      const roms = await gameClient.getUserRoms(abstractAddress);
      return roms;
    },
  });

  const claimEnergyMutation = useMutation({
    mutationFn: async ({
      romId,
      claimId,
    }: {
      romId: string;
      claimId: string;
    }) => {
      const response = await gameClient.claimEnergy({
        romId,
        claimId,
      });
      return response;
    },
    onMutate({ romId, claimId }) {
      const statusKey = `${romId}-${claimId}`;
      setClaimingStatus((state) => ({ ...state, [statusKey]: true }));
    },
    onSettled(_, __, { romId, claimId }) {
      const statusKey = `${romId}-${claimId}`;
      setClaimingStatus((state) => ({ ...state, [statusKey]: false }));
    },
  });

  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );

  if (isCollapsed) {
    return (
      <div className="border-l bg-background/95 backdrop-blur flex flex-col items-center py-4 h-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Cpu className="h-5 w-5 my-2 text-muted-foreground" />
        <Eye className="h-5 w-5 my-2 text-muted-foreground" />
        <Settings className="h-5 w-5 my-2 text-muted-foreground" />
      </div>
    );
  }

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
                console.log(query);
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roms">ROMS</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="flex-1 overflow-y-auto px-2 border-primary/20"
        >
          <GameStatus
            state={gigaverseState.data}
            lastUpdated={gigaverseState.dataUpdatedAt}
            refresh={async () => {
              await stateQuery.refetch();
              await gigaverseState.refetch();
            }}
          />

          <Card className="p-3 mb-3">
            <h4 className="text-sm font-medium mb-1">Message Count</h4>
            <p className="text-xs">{workingMemory.data.length}</p>
          </Card>

          <Card className="p-3 mb-3">
            <h4 className="text-sm font-medium mb-1">Agent Status</h4>
            <div className="text-xs flex items-center">
              {isLoading ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    Active - Processing
                  </span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                  <span>Idle - Ready</span>
                </>
              )}
            </div>
          </Card>

          <Card className="p-3 mb-3">
            <h4 className="text-sm font-medium mb-1">Message Types</h4>
            <div className="text-xs">
              <p>
                User:{" "}
                {
                  workingMemory.data.filter((m: any) => m.ref === "input")
                    .length
                }
              </p>
              <p>
                Agent:{" "}
                {
                  workingMemory.data.filter((m: any) => m.ref === "output")
                    .length
                }
              </p>
              <p>
                System:{" "}
                {
                  workingMemory.data.filter(
                    (m: any) => !(m.ref === "input" || m.ref === "output")
                  ).length
                }
              </p>
            </div>
          </Card>

          <Card className="p-3 mb-3">
            <h4 className="text-sm font-medium mb-1">Working Memory</h4>
            <div className="text-xs">
              <p>Size: {(workingMemory.data.length / 1024).toFixed(2)} KB</p>
              <p>Last Updated: {workingMemory.dataUpdatedAt}</p>
            </div>
          </Card>

          <Card className="p-3">
            <h4 className="text-sm font-medium mb-1">Chat Info</h4>
            <div className="text-xs">
              <p>Chat ID: {contextId.split(":").pop()}</p>
              <p>Started: {new Date().toLocaleDateString()}</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="memory">
          <div className="flex justify-between items-center mb-2 px-2">
            <h4 className="text-sm font-medium">Working Memory</h4>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFullMemory(!showFullMemory)}
                title={showFullMemory ? "Hide Details" : "Show Details"}
              >
                {showFullMemory ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  browserStorage().delete("working-memory:goal:1");
                  browserStorage().delete("memory:goal:1");
                  browserStorage().delete("context:goal:1");
                }}
              >
                <Trash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <Card className="p-3 flex-1 overflow-auto mx-4 mb-2">
            {workingMemory ? (
              <pre className="text-xs whitespace-pre-wrap break-all">
                {showFullMemory
                  ? JSON.stringify(workingMemory.data, null, 2)
                  : JSON.stringify(
                      {
                        logs: workingMemory.data?.length || 0,
                        // context: workingMemory.context
                        //   ? Object.keys(workingMemory.context)
                        //   : "N/A",
                        // logs: workingMemory.data,
                      },
                      null,
                      2
                    )}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">Loading memory...</p>
            )}
          </Card>

          <div className="px-4 pb-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(workingMemory, null, 2)
                );
              }}
              title="Copy Memory JSON"
            >
              <Code className="h-3 w-3 mr-1" />
              Copy JSON
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="roms">
          <div className="flex justify-between items-center mb-2 px-4">
            <h4 className="text-sm font-medium">ROMs</h4>
            {/* <Button
              size="sm"
              onClick={() => handleClaimEnergy({ romId: "1" })}
              disabled={isClaimingEnergy}
            >
              {isClaimingEnergy ? "Claiming..." : "Claim Energy"}
            </Button> */}
          </div>

          {romsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Loading ROMs...
            </p>
          ) : romsQuery.data && romsQuery.data.entities.length > 0 ? (
            <div className="space-y-3 p-2">
              {romsQuery.data?.entities.map((rom) => {
                // Calculate loading states for this ROM's buttons
                const isClaimingEnergy =
                  claimingStatus[`${rom.docId}-energy`] || false;
                const isClaimingShard =
                  claimingStatus[`${rom.docId}-shard`] || false;
                const isClaimingDust =
                  claimingStatus[`${rom.docId}-dust`] || false;

                // Calculate available resources based on production rates and time
                const calculatedEnergy = Math.min(
                  rom.factoryStats.percentageOfAWeekSinceLastEnergyClaim *
                    rom.factoryStats.maxEnergy,
                  rom.factoryStats.maxEnergy
                );
                const calculatedShard = Math.min(
                  rom.factoryStats.percentageOfAWeekSinceLastShardClaim *
                    rom.factoryStats.shardProductionPerWeek,
                  rom.factoryStats.maxShard
                );
                const calculatedDust = Math.min(
                  rom.factoryStats.percentageOfAWeekSinceLastDustClaim *
                    rom.factoryStats.dustProductionPerWeek,
                  rom.factoryStats.maxDust
                );

                return (
                  <Card
                    key={rom._id}
                    className="bg-card/80 border border-blue-900/50 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-semibold uppercase">
                              GIGA-ROM #{rom.docId}
                            </h3>
                            <div className="w-5 h-5 bg-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-black">
                              {rom.factoryStats.faction.charAt(0)}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {rom.factoryStats.tier}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rom.factoryStats.memory}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rom.factoryStats.serialNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">
                          Production Bonus: 0% {/* Placeholder */}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {/* Energy Production */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 bg-blue-900/30 p-1 rounded border border-blue-800/50 mb-1">
                          <div className="w-4 h-4 bg-cyan-500 rounded-full"></div>
                          <span className="text-xs font-medium">
                            {calculatedEnergy?.toFixed(0)} /{" "}
                            {rom.factoryStats.maxEnergy}
                          </span>
                        </div>
                        <Button
                          variant={isClaimingEnergy ? "secondary" : "default"}
                          size="sm"
                          className="w-full text-xs h-6"
                          disabled={isClaimingEnergy || calculatedEnergy < 1}
                          onClick={() =>
                            claimEnergyMutation.mutate({
                              romId: rom.docId,
                              claimId: "energy",
                            })
                          }
                        >
                          {isClaimingEnergy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : calculatedEnergy >= 1 ? (
                            "Claim"
                          ) : (
                            "Producing"
                          )}
                        </Button>
                      </div>

                      {/* Shard Production */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 bg-blue-900/30 p-1 rounded border border-blue-800/50 mb-1">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                          <span className="text-xs font-medium">
                            {Math.floor(calculatedShard)} /{" "}
                            {rom.factoryStats.maxShard}
                          </span>
                        </div>
                        <Button
                          variant={isClaimingShard ? "secondary" : "default"}
                          size="sm"
                          className="w-full text-xs h-6"
                          disabled={isClaimingShard || calculatedShard < 1}
                          onClick={() =>
                            claimEnergyMutation.mutate({
                              romId: rom.docId,
                              claimId: "shard",
                            })
                          }
                        >
                          {isClaimingShard ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : calculatedShard >= 1 ? (
                            "Claim"
                          ) : (
                            "Producing"
                          )}
                        </Button>
                      </div>

                      {/* Dust Production */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 bg-blue-900/30 p-1 rounded border border-blue-800/50 mb-1">
                          <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                          <span className="text-xs font-medium">
                            {Math.floor(calculatedDust)} /{" "}
                            {rom.factoryStats.maxDust}
                          </span>
                        </div>
                        <Button
                          variant={isClaimingDust ? "secondary" : "default"}
                          size="sm"
                          className="w-full text-xs h-6"
                          disabled={isClaimingDust || calculatedDust < 1}
                          onClick={() =>
                            claimEnergyMutation.mutate({
                              romId: rom.docId,
                              claimId: "dust",
                            })
                          }
                        >
                          {isClaimingDust ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : calculatedDust >= 1 ? (
                            "Claim"
                          ) : (
                            "Producing"
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No ROMs found for this address or failed to load.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

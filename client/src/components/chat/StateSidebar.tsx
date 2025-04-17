import { useState, useCallback, useEffect } from "react";
import { AnyAgent } from "@daydreamsai/core";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Code,
  Settings,
  Trash,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Card } from "@/components/ui/card";

import {
  getAbstractAddress,
  getApiBaseUrl,
  getGigaToken,
  goalContexts,
} from "@/agent/giga";
import { GameStatus } from "@/components/chat/GameStatus";
import { browserStorage } from "@/agent";
import { GameClient } from "@/agent/client/GameClient";
import { RomEntity } from "@/agent/client/types/responses";

export function StateSidebar({
  contextId,
  messages,
  dreams,
  isLoading,
}: {
  contextId: string;
  messages: any[];
  dreams: AnyAgent;
  isLoading?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [_isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [memoryStats, setMemoryStats] = useState<{
    size: number;
    lastUpdated: string;
  }>({
    size: 0,
    lastUpdated: "Not loaded",
  });
  const [workingMemory, setWorkingMemory] = useState<any>(null);
  const [showFullMemory, setShowFullMemory] = useState(false);

  const [goalContext, setGoalContext] = useState<any>(null);

  // ROMS Tab State
  const [userRoms, setUserRoms] = useState<RomEntity[]>([]);
  const [isFetchingRoms, setIsFetchingRoms] = useState(false);
  const [_isClaimingEnergy, setIsClaimingEnergy] = useState(false);

  const refreshMemoryStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const memory = await dreams.getWorkingMemory(contextId);
      setWorkingMemory(memory);
      setMemoryStats({
        size: JSON.stringify(memory).length,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      console.error("Failed to refresh memory stats:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [dreams, contextId]);

  useEffect(() => {
    refreshMemoryStats();
  }, [refreshMemoryStats]);

  // Fix async useMemo pattern
  useEffect(() => {
    let isMounted = true;
    const fetchGoalContext = async () => {
      try {
        // Use the goalContexts directly
        if (!goalContexts) {
          console.warn("Goal context not found");
          return;
        }

        const result = await dreams.getContext({
          context: goalContexts,
          args: {
            id: "chat:gigaverse-1",
          },
        });

        if (isMounted) {
          setGoalContext(result);
        }
      } catch (error) {
        console.error("Failed to fetch goal context:", error);
      }
    };

    fetchGoalContext();

    return () => {
      isMounted = false;
    };
  }, [dreams]);

  const gameClient = new GameClient(getApiBaseUrl(), getGigaToken());

  // Fetch User ROMs when ROMS tab is active
  useEffect(() => {
    if (activeTab === "roms" && getAbstractAddress()) {
      const fetchRoms = async () => {
        setIsFetchingRoms(true);

        try {
          const roms = await gameClient.getUserRoms(getAbstractAddress());
          console.log("roms", roms);
          setUserRoms(roms.entities);
        } catch (error) {
          console.error("Failed to fetch user ROMs:", error);
          setUserRoms([]);
        } finally {
          setIsFetchingRoms(false);
        }
      };
      fetchRoms();
    }
  }, [activeTab]);

  // Placeholder function for claiming energy
  const handleClaimEnergy = async ({ romId }: { romId: string }) => {
    setIsClaimingEnergy(true);
    try {
      console.log("Claiming energy...");

      const response = await gameClient.claimEnergy({
        romId: romId,
        claimId: "1",
      });

      console.log("response", response);
    } catch (error) {
      console.error("Failed to claim energy:", error);
      alert("Failed to claim energy. (Placeholder)");
    } finally {
      setIsClaimingEnergy(false);
    }
  };

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
    <div className="w-96 border-l bg-background/95 backdrop-blur flex flex-col ">
      <img src="/giga.jpeg" alt="Giga Banner" />
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        // className="flex-1 flex flex-col h-full mt-4"
      >
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="roms">ROMS</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="flex-1 overflow-y-auto px-2 border-primary/20"
        >
          <GameStatus goalContext={goalContext} />

          <Card className="p-3 mb-3">
            <h4 className="text-sm font-medium mb-1">Message Count</h4>
            <p className="text-xs">{messages.length}</p>
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
              <p>User: {messages.filter((m) => m.type === "user").length}</p>
              <p>Agent: {messages.filter((m) => m.type === "agent").length}</p>
              <p>
                System: {messages.filter((m) => m.type === "system").length}
              </p>
            </div>
          </Card>

          <Card className="p-3 mb-3">
            <h4 className="text-sm font-medium mb-1">Working Memory</h4>
            <div className="text-xs">
              <p>Size: {(memoryStats.size / 1024).toFixed(2)} KB</p>
              <p>Last Updated: {memoryStats.lastUpdated}</p>
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
                  ? JSON.stringify(workingMemory, null, 2)
                  : JSON.stringify(
                      {
                        messages: workingMemory.messages?.length || 0,
                        context: workingMemory.context
                          ? Object.keys(workingMemory.context)
                          : "N/A",
                        keys: Object.keys(workingMemory),
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

          {isFetchingRoms ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Loading ROMs...
            </p>
          ) : userRoms.length > 0 ? (
            <div className="space-y-3 p-2">
              {userRoms.map((rom) => {
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
                          variant="default"
                          size="sm"
                          className="w-full text-xs h-6"
                          disabled={calculatedEnergy < 1} // Disable if less than 1 energy
                          onClick={() =>
                            handleClaimEnergy({ romId: rom.docId })
                          } // Add claim handler
                        >
                          {calculatedEnergy >= 1 ? "Claim" : "Producing"}
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
                          variant="default"
                          size="sm"
                          className="w-full text-xs h-6"
                          disabled={calculatedShard < 1} // Disable if less than 1 shard
                          // onClick={() => handleClaimShard({ romId: rom.docId })} // Placeholder for claim handler
                        >
                          {calculatedShard >= 1 ? "Claim" : "Producing"}
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
                          variant="default"
                          size="sm"
                          className="w-full text-xs h-6"
                          disabled={calculatedDust < 1} // Disable if less than 1 dust
                          // onClick={() => handleClaimDust({ romId: rom.docId })} // Placeholder for claim handler
                        >
                          {calculatedDust >= 1 ? "Claim" : "Producing"}
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
      {/* <div className="flex justify-between items-center p-4">
        <h3 className="font-medium">Chat State</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshMemoryStats}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Model</span>
        </div>
        <Select value={selectedModel} onValueChange={handleModelChange}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {VALID_MODELS.map((model) => {
              const displayName = model
                .split("/")
                .pop()
                ?.replace(/-/g, " ")
                .replace(/:beta$/, " (Beta)");

              return (
                <SelectItem key={model} value={model} className="text-sm">
                  {displayName || model}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {modelChangeNotification && (
          <div className="mt-2 text-xs p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md transition-opacity duration-300">
            Model changed to{" "}
            <span className="font-medium">
              {selectedModel
                .split("/")
                .pop()
                ?.replace(/-/g, " ")
                .replace(/:beta$/, " (Beta)")}
            </span>
            . New messages will use this model.
          </div>
        )}
      </div>

      <div className="px-4 pb-2 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Display Settings</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="showThoughts" className="text-sm">
              Show Thoughts
            </Label>
            <Switch
              id="showThoughts"
              checked={settings.showThoughtMessages}
              onCheckedChange={settings.setShowThoughtMessages}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showSystem" className="text-sm">
              Show System Messages
            </Label>
            <Switch
              id="showSystem"
              checked={settings.showSystemMessages}
              onCheckedChange={settings.setShowSystemMessages}
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-border mx-4 my-2"></div> */}
    </div>
  );
}

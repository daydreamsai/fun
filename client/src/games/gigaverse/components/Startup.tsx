import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { useAgentStore } from "@/store/agentStore";

interface DungeonConfig {
  type: "dungeon";
  numberOfRuns: number;
  selectedDungeon: string | null;
  selectedDungeonId: number | null;
  useConsumables: boolean;
  lootStrategy: "Balanced" | "Glass Canon" | "Tank" | "Two Move Specialist";
}

interface FishingConfig {
  type: "fishing";
  consumables: string[];
}

type GameConfig = DungeonConfig | FishingConfig;

interface StartupProps {
  state: ContextState<GigaverseContext>;
}

// Mapping of dungeon ID to required skill level
const skillByDungeon: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
};

export function Startup({ state }: StartupProps) {
  const { agent } = useAgentStore();
  const [gameMode, setGameMode] = useState<"dungeon" | "fishing">("dungeon");
  const [config, setConfig] = useState<GameConfig>({
    type: "dungeon",
    numberOfRuns: 1,
    selectedDungeon: null,
    selectedDungeonId: null,
    useConsumables: false,
    lootStrategy: "Balanced",
  });

  const { game } = state.options;
  const { player } = game;
  const dungeons = game.today.dungeonDataEntities;
  const skills = player.skills.entities;

  const { gear, consumables } = player;

  // console.log(consumables);

  const handleGameModeChange = (mode: "dungeon" | "fishing") => {
    setGameMode(mode);
    if (mode === "dungeon") {
      setConfig({
        type: "dungeon",
        numberOfRuns: 1,
        selectedDungeon: null,
        selectedDungeonId: null,
        useConsumables: false,
        lootStrategy: "Balanced",
      });
    } else {
      setConfig({
        type: "fishing",
        consumables: [],
      });
    }
  };

  const handleDungeonSelect = (dungeonName: string, dungeonId: number) => {
    if (config.type === "dungeon") {
      setConfig({
        ...config,
        selectedDungeon: dungeonName,
        selectedDungeonId: dungeonId,
      });
    }
  };

  const handleRunsChange = (value: string) => {
    const runs = parseInt(value) || 1;
    if (config.type === "dungeon") {
      setConfig({ ...config, numberOfRuns: Math.max(1, runs) });
    }
  };

  const handleConsumablesToggle = (checked: boolean) => {
    if (config.type === "dungeon") {
      setConfig({ ...config, useConsumables: checked });
    }
  };

  const handleLootStrategyChange = (value: string) => {
    if (config.type === "dungeon") {
      setConfig({
        ...config,
        lootStrategy: value as
          | "Balanced"
          | "Glass Canon"
          | "Tank"
          | "Two Move Specialist",
      });
    }
  };

  const handleStartGame = async () => {
    if (config.type === "dungeon" && config.selectedDungeon) {
      await agent.send({
        context: state.context,
        args: state.args,
        input: {
          type: "message",
          data: {
            user: "player",
            content: JSON.stringify({
              type: "dungeon",
              numberOfRuns: config.numberOfRuns,
              selectedDungeon: config.selectedDungeon,
              selectedDungeonId: config.selectedDungeonId,
              useConsumables: config.useConsumables,
              lootStrategy: config.lootStrategy,
            }),
          },
        },
      });
    }
  };

  return (
    <div className="bg-card p-3 rounded-lg border">
      <h3 className="text-sm font-semibold mb-3">Start New Run</h3>
      <Tabs
        value={gameMode}
        onValueChange={(v) =>
          handleGameModeChange(v as "dungeon" | "fishing")
        }
      >
        <TabsList className="grid w-full grid-cols-1 mb-3">
          <TabsTrigger value="dungeon">Dungeon Runs</TabsTrigger>
        </TabsList>

        <TabsContent value="dungeon" className="space-y-3">
            {/* Number of Runs and Loot Strategy inline */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="runs" className="text-xs">Runs</Label>
                <Input
                  id="runs"
                  type="number"
                  min="1"
                  value={config.type === "dungeon" ? config.numberOfRuns : 1}
                  onChange={(e) => handleRunsChange(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Strategy</Label>
                <Select
                  value={config.type === "dungeon" ? config.lootStrategy : "Balanced"}
                  onValueChange={handleLootStrategyChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Balanced">Balanced</SelectItem>
                    <SelectItem value="Glass Canon">Glass Canon</SelectItem>
                    <SelectItem value="Tank">Tank</SelectItem>
                    <SelectItem value="Two Move Specialist">Two Move</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dungeon Selection */}
            <div>
              <Label className="text-xs">Select Dungeon</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {dungeons.map((dungeon) => {
                  const isCheckpointClear =
                    dungeon.CHECKPOINT_CID > 0
                      ? state.options.game.player.account.checkpointProgress.find(
                          (checkpoint) =>
                            parseInt(checkpoint.ID_CID) ===
                            dungeon.CHECKPOINT_CID
                        )?.COMPLETE_CID
                      : true;

                  const requiredSkillLevel =
                    skills.find(
                      (skill) =>
                        skill.SKILL_CID === skillByDungeon[dungeon.ID_CID]
                    )?.LEVEL_CID ?? 0;

                  const canPlay =
                    isCheckpointClear &&
                    player.energy.entities[0].parsedData.energyValue >=
                      dungeon.ENERGY_CID;

                  return (
                    <Button
                      key={dungeon.ID_CID}
                      variant={
                        config.type === "dungeon" &&
                        config.selectedDungeon === dungeon.NAME_CID
                          ? "default"
                          : "outline"
                      }
                      className="h-auto flex-col py-2 px-2"
                      disabled={!canPlay}
                      onClick={() =>
                        handleDungeonSelect(dungeon.NAME_CID, dungeon.ID_CID)
                      }
                    >
                      <span className="font-medium text-xs mb-1">
                        {dungeon.NAME_CID}
                      </span>
                      <div className="flex gap-1 text-[10px]">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          ⚡{dungeon.ENERGY_CID}
                        </Badge>
                        <Badge className="text-[10px] px-1 py-0">
                          Lv.{requiredSkillLevel}
                        </Badge>
                        {!isCheckpointClear && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">
                            🔒
                          </Badge>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Equipment Summary */}
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Head:</span>
                <span className="font-medium">{gear.head?.NAME_CID || "None"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Body:</span>
                <span className="font-medium">{gear.body?.NAME_CID || "None"}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fishing" className="space-y-6">
            <div className="space-y-2">
              <Label>Select Consumables for Fishing</Label>
              {consumables.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {consumables
                    .filter(
                      (item) =>
                        item.item.name.toLowerCase().includes("bait") ||
                        item.item.name.toLowerCase().includes("fish")
                    )
                    .map((item) => (
                      <div
                        key={item.item.id}
                        className="flex justify-between items-center p-3 rounded-lg bg-secondary/30"
                      >
                        <span className="text-sm font-medium">
                          {item.item.name}
                        </span>
                        <Badge variant="secondary">x{item.balance}</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No fishing consumables available
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

      {/* Action Button */}
      <Button
        className="w-full mt-3"
        variant="default"
        onClick={handleStartGame}
        disabled={
          (config.type === "dungeon" && !config.selectedDungeon) ||
          (config.type === "fishing" && consumables.length === 0)
        }
      >
        🚀 Start {gameMode === "dungeon" ? "Dungeon Run" : "Fishing"}
      </Button>
    </div>
  );
}

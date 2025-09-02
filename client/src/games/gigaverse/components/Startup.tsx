import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
import { useGigaverseStore } from "@/store/gigaverseStore";

interface DungeonConfig {
  type: "dungeon";
  numberOfRuns: number;
  runType: "classic" | "juiced";
  selectedDungeon: string | null;
  selectedDungeonId: number | null;
  useConsumables: boolean;
  lootStrategy: "Balanced" | "Glass Canon" | "Tank" | "Two Move Specialist";
}

interface FishingConfig {
  type: "fishing";
  fishingSize: "small" | "normal" | "big" | null;
  numberOfRuns: number;
  consumables: string[];
}

type GameConfig = DungeonConfig | FishingConfig;

interface StartupProps {
  state: ContextState<GigaverseContext>;
  compact?: boolean;
}

// Mapping of dungeon ID to required skill level
const skillByDungeon: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
};

export function Startup({ state, compact = false }: StartupProps) {
  const { agent } = useAgentStore();
  const { gameMode, config, setGameMode, setConfig, updateConfig } = useGigaverseStore();

  const { game } = state.options;
  const { player } = game;
  const dungeons = game.today.dungeonDataEntities;
  const skills = player.skills.entities;

  const { gear, consumables } = player;

  // console.log(consumables);

  const handleGameModeChange = (mode: "dungeon" | "fishing") => {
    setGameMode(mode);
  };

  const handleDungeonSelect = (dungeonName: string, dungeonId: number) => {
    if (config.type === "dungeon") {
      const isGigus = dungeonName.toLowerCase().includes('gigus');
      const selectedDungeon = dungeons.find(d => d.NAME_CID === dungeonName);
      
      if (selectedDungeon) {
        const newRunType = isGigus ? "classic" : config.runType;
        const energyCost = selectedDungeon.ENERGY_CID;
        const currentEnergy = player.energy.entities[0].parsedData.energyValue;
        const energyMultiplier = newRunType === "juiced" ? 3 : 1;
        const newMaxRuns = Math.floor(currentEnergy / (energyCost * energyMultiplier));
        
        updateConfig({
          selectedDungeon: dungeonName,
          selectedDungeonId: dungeonId,
          runType: newRunType,
          numberOfRuns: Math.min(config.numberOfRuns, newMaxRuns)
        });
      }
    }
  };

  const handleRunsChange = (value: string) => {
    const runs = parseInt(value) || 1;
    if (config.type === "dungeon") {
      updateConfig({ numberOfRuns: Math.max(1, runs) });
    }
  };

  const handleConsumablesToggle = (checked: boolean) => {
    if (config.type === "dungeon") {
      updateConfig({ useConsumables: checked });
    }
  };

  const handleLootStrategyChange = (value: string) => {
    if (config.type === "dungeon") {
      updateConfig({
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
              runType: config.runType,
              selectedDungeon: config.selectedDungeon,
              selectedDungeonId: config.selectedDungeonId,
              useConsumables: config.useConsumables,
              lootStrategy: config.lootStrategy,
            }),
          },
        },
      });
    } else if (config.type === "fishing") {
      await agent.send({
        context: state.context,
        args: state.args,
        input: {
          type: "message",
          data: {
            user: "player",
            content: JSON.stringify({
              type: "fishing",
              numberOfRuns: config.numberOfRuns,
              fishingSize: config.fishingSize,
              consumables: config.consumables,
            }),
          },
        },
      });
    }
  };

  const content = (
    <>
      <Tabs
        value={gameMode}
        onValueChange={(v) =>
          handleGameModeChange(v as "dungeon" | "fishing")
        }
      >
        <TabsList className="grid w-full grid-cols-2 mb-3">
          <TabsTrigger value="dungeon">Dungeon</TabsTrigger>
          <TabsTrigger value="fishing">Fishing</TabsTrigger>
        </TabsList>

        <TabsContent value="dungeon" className="space-y-3">
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

                  const isVoidDungeon = dungeon.NAME_CID.toLowerCase().includes('void');

                  const canPlay =
                    isCheckpointClear &&
                    !isVoidDungeon &&
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
                        {isVoidDungeon && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">
                            🚫
                          </Badge>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Run Configuration - Only show if dungeon is selected */}
            {config.type === "dungeon" && config.selectedDungeon && (
              <div className="space-y-4">
                {/* Determine available runs based on energy and juice status */}
                {(() => {
                  const selectedDungeon = dungeons.find(d => d.NAME_CID === config.selectedDungeon);
                  if (!selectedDungeon) return null;

                  const energyCost = selectedDungeon.ENERGY_CID;
                  const currentEnergy = player.energy.entities[0].parsedData.energyValue;
                  const isJuiced = player.juice?.juiceData?.isJuiced || false;
                  const isGigus = selectedDungeon.NAME_CID.toLowerCase().includes('gigus');
                  
                  // Calculate max runs based on run type
                  const isJuicedRun = config.runType === "juiced";
                  const dailyLimit = isJuicedRun ? 4 : 12;
                  const energyMultiplier = isJuicedRun ? 3 : 1;
                  const maxRuns = Math.min(dailyLimit, Math.floor(currentEnergy / (energyCost * energyMultiplier)));

                  return (
                    <div className="space-y-4">
                      {/* Run Type Toggle - Show if juiced, disable for Gigus */}
                      {isJuiced && (
                        <div className="space-y-2">
                          <Label className="text-xs">Run Type</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <Switch
                              checked={config.runType === "juiced"}
                              disabled={isGigus}
                              onCheckedChange={(checked) => {
                                const newRunType = checked ? "juiced" : "classic";
                                const newEnergyMultiplier = newRunType === "juiced" ? 3 : 1;
                                const newMaxRuns = Math.min(
                                  newRunType === "juiced" ? 4 : 12, 
                                  Math.floor(currentEnergy / (energyCost * newEnergyMultiplier))
                                );
                                
                                updateConfig({
                                  runType: newRunType,
                                  numberOfRuns: Math.min(config.numberOfRuns, newMaxRuns)
                                });
                              }}
                            />
                            <Label className="text-xs">
                              {config.runType === "juiced" ? "Juiced (3x rewards, 3x energy)" : "Classic"}
                            </Label>
                          </div>
                        </div>
                      )}

                      {/* Runs Slider */}
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center justify-between">
                          <span>Runs</span>
                          <span className="text-muted-foreground">{config.numberOfRuns} run{config.numberOfRuns !== 1 ? 's' : ''}</span>
                        </Label>
                        <Slider
                          value={[config.numberOfRuns]}
                          onValueChange={(value) => updateConfig({ numberOfRuns: value[0] })}
                          max={maxRuns}
                          min={0}
                          step={1}
                          disabled={maxRuns === 0}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Energy cost: {energyCost * energyMultiplier * config.numberOfRuns}/{currentEnergy}</span>
                          <span>Max: {maxRuns}</span>
                        </div>
                      </div>

                      {/* Strategy Selection */}
                      <div>
                        <Label className="text-xs">Loot Strategy</Label>
                        <Select
                          value={config.lootStrategy}
                          onValueChange={handleLootStrategyChange}
                        >
                          <SelectTrigger className="h-8 text-xs mt-2">
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
                  );
                })()}
              </div>
            )}

          </TabsContent>

          <TabsContent value="fishing" className="space-y-3">
            {/* Fishing Size Selection */}
            <div>
              <Label className="text-xs">Fishing Size</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { size: "small", energy: 12, label: "Small Cast" },
                  { size: "normal", energy: 16, label: "Normal Cast" },
                  { size: "big", energy: 20, label: "Big Cast" }
                ].map((option) => {
                  const canFish = false; // Disabled while agent is being implemented
                  
                  return (
                    <Button
                      key={option.size}
                      variant={
                        config.type === "fishing" && config.fishingSize === option.size
                          ? "default"
                          : "outline"
                      }
                      className="h-auto flex-col py-2 px-2"
                      disabled={!canFish}
                      onClick={() => {
                        if (config.type === "fishing") {
                          const currentEnergy = player.energy.entities[0].parsedData.energyValue;
                          const newMaxRuns = Math.floor(currentEnergy / option.energy);
                          
                          updateConfig({
                            fishingSize: option.size as "small" | "normal" | "big",
                            numberOfRuns: Math.min(config.numberOfRuns, newMaxRuns)
                          });
                        }
                      }}
                    >
                      <span className="font-medium text-xs mb-1">
                        {option.label}
                      </span>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          ⚡{option.energy}
                        </Badge>
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                          🚫
                        </Badge>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Fishing Runs Configuration */}
            {config.type === "fishing" && config.fishingSize && (
              <div className="space-y-4">
                {(() => {
                  const energyCosts = { small: 12, normal: 16, big: 20 };
                  const energyCost = energyCosts[config.fishingSize];
                  const currentEnergy = player.energy.entities[0].parsedData.energyValue;
                  const maxRuns = Math.floor(currentEnergy / energyCost);

                  return (
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center justify-between">
                        <span>Runs</span>
                        <span className="text-muted-foreground">{config.numberOfRuns} run{config.numberOfRuns !== 1 ? 's' : ''}</span>
                      </Label>
                      <Slider
                        value={[config.numberOfRuns]}
                        onValueChange={(value) => updateConfig({ numberOfRuns: value[0] })}
                        max={maxRuns}
                        min={0}
                        step={1}
                        disabled={maxRuns === 0}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Energy cost: {energyCost * config.numberOfRuns}/{currentEnergy}</span>
                        <span>Max: {maxRuns}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>
        </Tabs>

      {/* Action Button */}
      <Button
        className="w-full mt-3"
        variant="default"
        onClick={handleStartGame}
        disabled={
          (config.type === "dungeon" && (!config.selectedDungeon || config.numberOfRuns <= 0)) ||
          (config.type === "fishing" && config.numberOfRuns <= 0)
        }
      >
        🚀 Start {gameMode === "dungeon" ? "Dungeon Run" : "Fishing"}
      </Button>
    </>
  );

  if (compact) {
    return content;
  }

  return (
    <div className="bg-card p-3 rounded-lg border">
      <h3 className="text-sm font-semibold mb-3">Start New Run</h3>
      {content}
    </div>
  );
}

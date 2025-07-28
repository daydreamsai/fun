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
import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { useAgentStore } from "@/store/agentStore";

interface DungeonConfig {
  type: "dungeon";
  numberOfRuns: number;
  selectedDungeon: string | null;
  selectedDungeonId: number | null;
  useConsumables: boolean;
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
  });

  const { game } = state.options;
  const { player } = game;
  const dungeons = game.today.dungeonDataEntities;
  const skills = player.skills.entities;

  const { gear, consumables } = player;

  console.log(consumables);

  const handleGameModeChange = (mode: "dungeon" | "fishing") => {
    setGameMode(mode);
    if (mode === "dungeon") {
      setConfig({
        type: "dungeon",
        numberOfRuns: 1,
        selectedDungeon: null,
        selectedDungeonId: null,
        useConsumables: false,
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
            }),
          },
        },
      });
    }
  };

  return (
    <Card className="w-full border-none">
      <CardHeader>
        <CardTitle>Gigaverse Configuration</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          value={gameMode}
          onValueChange={(v) =>
            handleGameModeChange(v as "dungeon" | "fishing")
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dungeon">Dungeon</TabsTrigger>
            <TabsTrigger value="fishing">Fishing</TabsTrigger>
          </TabsList>

          <TabsContent value="dungeon" className="space-y-6">
            {/* Number of Runs */}
            <div className="space-y-2">
              <Label htmlFor="runs">Number of Runs</Label>
              <Input
                id="runs"
                type="number"
                min="1"
                value={config.type === "dungeon" ? config.numberOfRuns : 1}
                onChange={(e) => handleRunsChange(e.target.value)}
                className="w-32"
              />
            </div>

            {/* Dungeon Selection */}
            <div className="space-y-2">
              <Label>Select Dungeon</Label>
              <div className="grid grid-cols-2 gap-2">
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
                      className="h-auto flex-col py-4 px-3"
                      disabled={!canPlay}
                      onClick={() =>
                        handleDungeonSelect(dungeon.NAME_CID, dungeon.ID_CID)
                      }
                    >
                      <span className="font-medium text-xs mb-2 uppercase">
                        {dungeon.NAME_CID}
                      </span>
                      <div className="flex flex-col gap-1 w-full">
                        <Badge
                          variant="secondary"
                          className="w-full justify-center"
                        >
                          Energy: {dungeon.ENERGY_CID}
                        </Badge>
                        <Badge className="w-full justify-center">
                          Level: {requiredSkillLevel}
                        </Badge>
                        {!isCheckpointClear && (
                          <Badge
                            variant="destructive"
                            className="w-full justify-center"
                          >
                            Locked
                          </Badge>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Use Consumables Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="consumables" className="flex flex-col gap-1">
                <span>Use Consumables</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Automatically use consumables during runs
                </span>
              </Label>
              <Switch
                id="consumables"
                checked={
                  config.type === "dungeon" ? config.useConsumables : false
                }
                onCheckedChange={handleConsumablesToggle}
              />
            </div>

            <Separator />

            {/* Current Equipment */}
            <div className="space-y-2">
              <Label>Current Equipment</Label>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium text-muted-foreground">
                    Head
                  </span>
                  <span className="text-sm font-medium">
                    {gear.head?.NAME_CID || "None"}
                  </span>
                  <img
                    src={gear.head?.ICON_URL_CID}
                    alt={gear.head?.NAME_CID || ""}
                    className="w-10 h-10 rounded-md"
                  />
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium text-muted-foreground">
                    Body
                  </span>
                  <span className="text-sm font-medium">
                    {gear.body?.NAME_CID || "None"}
                  </span>
                  <img
                    src={gear.body?.ICON_URL_CID}
                    alt={gear.body?.NAME_CID || ""}
                    className="w-10 h-10 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Available Consumables */}
            {consumables.length > 0 && (
              <div className="space-y-2">
                <Label>Available Consumables</Label>
                <div className="grid grid-cols-2 gap-2">
                  {consumables.map((item) => (
                    <div
                      key={item.item.id}
                      className="flex flex-col justify-between items-center p-1 rounded-lg bg-secondary/30 text-sm"
                    >
                      <span className="text-xs uppercase">
                        {item.item.name} [x{item.balance}]
                      </span>
                      <img
                        src={item.item.img}
                        alt={item.item.name}
                        className="w-10 h-10 rounded-md"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button
            className="flex-1"
            variant="default"
            onClick={handleStartGame}
            disabled={
              (config.type === "dungeon" && !config.selectedDungeon) ||
              (config.type === "fishing" && consumables.length === 0)
            }
          >
            Start {gameMode === "dungeon" ? "Dungeon Run" : "Fishing"}
          </Button>
          <Button variant="outline">Save Configuration</Button>
        </div>

        {/* Current Configuration Preview */}
        <div className="mt-6 p-4 rounded-lg bg-muted">
          <h4 className="text-sm font-medium mb-2">Current Configuration</h4>
          <pre className="text-xs">{JSON.stringify(config, null, 2)}</pre>
        </div>
      </CardContent>
    </Card>
  );
}

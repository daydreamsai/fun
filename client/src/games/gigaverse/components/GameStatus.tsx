import { Card } from "@/components/ui/card";
import { ContextState } from "@daydreamsai/core";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { MAX_ENERGY } from "../client/GameClient";
import { GigaverseContext } from "../context";

interface GameStatusProps {
  state: ContextState<GigaverseContext> | undefined;
  lastUpdated: number;
  refresh: () => void;
}

export function GameStatus({ state, refresh }: GameStatusProps) {
  if (!state) return null;
  return (
    <div className="">
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium uppercase">Energy</span>
          <span className="text-sm">
            {state.memory.energy?.toFixed(1)} / {MAX_ENERGY}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={refresh}
            className="w-7 h-7"
          >
            <RefreshCcw />
          </Button>
        </div>
        <div className="w-full bg-gray-200 h-2.5 dark:bg-gray-700">
          <div
            className="bg-primary h-2.5 animate-pulse"
            style={{
              width: `${Math.min(100, (state.memory.energy / 240) * 100)}%`,
            }}
          ></div>
        </div>
      </div>
      {state?.memory.currentDungeon !== null && (
        <>
          <div className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium uppercase">
                Loot Available
              </span>
              <span className="text-sm">
                {state.memory.lootPhase || "None"}
              </span>
            </div>
          </div>
          <div className="py-2">
            <h5 className="text-sm font-medium mb-2 text-secondary-foreground uppercase text-center bg-secondary">
              Dungeon
            </h5>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="text-sm text-muted-foreground uppercase">
                  Room
                </span>
                <div className="text-2xl font-medium">
                  {state.memory.currentRoom || "Unknown"}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground uppercase">
                  Dungeon id
                </span>
                <div className="text-2xl font-medium">
                  {state.memory.currentDungeon || "Unknown"}
                </div>
              </div>
            </div>
          </div>

          <div className="py-2">
            <h5 className="text-sm font-medium mb-2 text-secondary-foreground uppercase text-center bg-secondary">
              Last Move Status
            </h5>
            <div className="text-sm">
              {state.memory.lastBattleResult ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-sm text-muted-foreground uppercase">
                      Player
                    </span>
                    <div className="text-lg font-medium uppercase">
                      {state.memory.player.lastMove}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground uppercase">
                      Result
                    </span>
                    <div className="text-lg font-medium uppercase">
                      {state.memory.lastBattleResult}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground uppercase">
                      Enemy
                    </span>
                    <div className="text-lg font-medium uppercase">
                      {state.memory.enemy.lastMove}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-center">
                  No moves yet
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2">
            <div className="">
              <h5 className="text-sm font-medium mb-2 text-secondary-foreground uppercase text-center bg-secondary">
                Player
              </h5>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">HP:</span>
                  <span className="text-sm font-medium">
                    {state.memory.player.health.current}/
                    {state.memory.player.health.currentMax}
                  </span>
                </div>
                <div className="w-full bg-muted  h-2 mt-1">
                  <div
                    className="bg-green-600/80 h-2 "
                    style={{
                      width: `${
                        state.memory.player.health.current &&
                        state.memory.player.health.currentMax
                          ? (state.memory.player.health.current /
                              state.memory.player.health.currentMax) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">Shield:</span>
                  <span className="text-sm font-medium">
                    {state.memory.player.shield.current}/
                    {state.memory.player.shield.currentMax}
                  </span>
                </div>
                <div className="w-full bg-muted  h-2 mt-1">
                  <div
                    className="bg-blue-600/80 h-2 "
                    style={{
                      width: `${
                        state.memory.player.shield.current &&
                        state.memory.player.shield.currentMax
                          ? (state.memory.player.shield.current /
                              state.memory.player.shield.currentMax) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="">
              <h5 className="text-sm font-medium mb-2 uppercase text-center text-secondary-foreground bg-secondary">
                Enemy
              </h5>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">HP:</span>
                  <span className="text-sm font-medium">
                    {state.memory.enemy.health.current}/
                    {state.memory.enemy.health.currentMax}
                  </span>
                </div>
                <div className="w-full bg-muted  h-2 mt-1">
                  <div
                    className="bg-red-600/80 h-2 "
                    style={{
                      width: `${
                        state.memory.enemy.health.current &&
                        state.memory.enemy.health.currentMax
                          ? (state.memory.enemy.health.current /
                              state.memory.enemy.health.currentMax) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">Shield:</span>
                  <span className="text-sm font-medium">
                    {state.memory.enemy.shield.current}/
                    {state.memory.enemy.shield.currentMax}
                  </span>
                </div>
                <div className="w-full bg-muted  h-2 mt-1">
                  <div
                    className="bg-purple-600/80 h-2 "
                    style={{
                      width: `${
                        state.memory.enemy.shield.current &&
                        state.memory.enemy.shield.currentMax
                          ? (state.memory.enemy.shield.current /
                              state.memory.enemy.shield.currentMax) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div className="py-2">
            <h5 className="text-sm font-medium mb-2 text-secondary-foreground bg-secondary uppercase text-center">
              Weapons
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
                <div className="font-medium">
                  ⚔️ x {state.memory.player.rock.currentCharges}
                </div>
                <div className="text-sm mt-1 space-y-0.5 w-full">
                  <div className="flex justify-between">
                    <span>ATK:</span>
                    <span>{state.memory.player.rock.currentATK}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEF:</span>
                    <span>{state.memory.player.rock.currentDEF}</span>
                  </div>
                </div>
              </div>
              <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
                <div className="font-medium">
                  🛡️ x {state.memory.player.paper.currentCharges}
                </div>
                <div className="text-sm mt-1 space-y-0.5 w-full">
                  <div className="flex justify-between">
                    <span>ATK:</span>
                    <span>{state.memory.player.paper.currentATK}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEF:</span>
                    <span>{state.memory.player.paper.currentDEF}</span>
                  </div>
                </div>
              </div>
              <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
                <div className="font-medium">
                  ✨ x {state.memory.player.scissor.currentCharges}
                </div>
                <div className="text-sm mt-1 space-y-0.5 w-full">
                  <div className="flex justify-between">
                    <span>ATK:</span>
                    <span>{state.memory.player.scissor.currentATK}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEF:</span>
                    <span>{state.memory.player.scissor.currentDEF}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="py-2">
            <h5 className="text-sm font-medium mb-2 uppercase text-center text-secondary-foreground bg-secondary">
              Enemy Weapons
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
                <div className="font-medium">
                  ⚔️ x {state.memory.enemy.rock.currentCharges}
                </div>
                <div className="text-sm mt-1 space-y-0.5 w-full">
                  <div className="flex justify-between">
                    <span>ATK:</span>
                    <span>{state.memory.enemy.rock.currentATK}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEF:</span>
                    <span>{state.memory.enemy.rock.currentDEF}</span>
                  </div>
                </div>
              </div>
              <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
                <div className="font-medium">
                  🛡️ x {state.memory.enemy.paper.currentCharges}
                </div>
                <div className="text-sm mt-1 space-y-0.5 w-full">
                  <div className="flex justify-between">
                    <span>ATK:</span>
                    <span>{state.memory.enemy.paper.currentATK}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEF:</span>
                    <span>{state.memory.enemy.paper.currentDEF}</span>
                  </div>
                </div>
              </div>
              <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
                <div className="font-medium">
                  ✨ x {state.memory.enemy.scissor.currentCharges}
                </div>
                <div className="text-sm mt-1 space-y-0.5 w-full">
                  <div className="flex justify-between">
                    <span>ATK:</span>
                    <span>{state.memory.enemy.scissor.currentATK}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEF:</span>
                    <span>{state.memory.enemy.scissor.currentDEF}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

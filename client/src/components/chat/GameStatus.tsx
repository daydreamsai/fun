import { MAX_ENERGY } from "@/agent/client/GameClient";
import { Card } from "@/components/ui/card";

interface GameStatusProps {
  goalContext: any;
}

export function GameStatus({ goalContext }: GameStatusProps) {
  return (
    <Card className="p-1 mb-4 border-2 border-primary/20 bg-primary/5 ">
      <div className="flex flex-col w-full bg-background/80 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium uppercase">Energy</span>
          <span className="text-sm">
            {goalContext?.memory?.energy?.toFixed(1) || 0} / {MAX_ENERGY}
          </span>
        </div>
        <div className="w-full bg-gray-200 h-2.5 dark:bg-gray-700">
          <div
            className="bg-primary h-2.5 animate-pulse"
            style={{
              width: `${Math.min(100, ((goalContext?.memory?.energy || 0) / 240) * 100)}%`,
            }}
          ></div>
        </div>
      </div>
      <div className="bg-background/80 p-3 rounded-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium uppercase">Loot Available</span>
          <span className="text-sm">
            {goalContext?.memory?.lootPhase || "None"}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="bg-background/80 p-2 rounded-md">
          <h5 className="text-sm font-medium mb-2 text-primary/80 uppercase text-center bg-primary/10">
            Location
          </h5>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="text-sm text-muted-foreground uppercase">
                Room
              </span>
              <div className="text-2xl font-medium">
                {goalContext?.memory?.currentRoom || "Unknown"}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground uppercase">
                Dungeon id
              </span>
              <div className="text-2xl font-medium">
                {goalContext?.memory?.currentDungeon || "Unknown"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background/80 p-2 rounded-md">
          <h5 className="text-sm font-medium mb-2 text-primary/80 uppercase text-center bg-primary/10">
            Battle Status
          </h5>
          <div className="text-sm">
            {goalContext?.memory?.lastBattleResult ? (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <span className="text-sm text-muted-foreground uppercase">
                    Result
                  </span>
                  <div className="text-lg font-medium">
                    {goalContext?.memory?.lastBattleResult}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground uppercase">
                    Enemy Move
                  </span>
                  <div className="text-lg font-medium">
                    {goalContext?.memory?.lastEnemyMove}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">No battles yet</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <div className="bg-background/80 p-2 rounded-md">
            <h5 className="text-sm font-medium mb-2 text-primary/80 uppercase text-center bg-primary/10">
              Player
            </h5>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">HP:</span>
                <span className="text-sm font-medium">
                  {goalContext?.memory?.playerHealth || 0}/
                  {goalContext?.memory?.playerMaxHealth || 0}
                </span>
              </div>
              <div className="w-full bg-muted  h-2 mt-1">
                <div
                  className="bg-green-500 h-2 "
                  style={{
                    width: `${
                      goalContext?.memory?.playerHealth &&
                      goalContext?.memory?.playerMaxHealth
                        ? (goalContext?.memory?.playerHealth /
                            goalContext?.memory?.playerMaxHealth) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm">Shield:</span>
                <span className="text-sm font-medium">
                  {goalContext?.memory?.playerShield || 0}/
                  {goalContext?.memory?.playerMaxShield || 0}
                </span>
              </div>
              <div className="w-full bg-muted  h-2 mt-1">
                <div
                  className="bg-blue-500 h-2 "
                  style={{
                    width: `${
                      goalContext?.memory?.playerShield &&
                      goalContext?.memory?.playerMaxShield
                        ? (goalContext?.memory?.playerShield /
                            goalContext?.memory?.playerMaxShield) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-background/80 p-3 rounded-md">
            <h5 className="text-sm font-medium mb-2 text-primary/80 uppercase text-center bg-primary/10">
              Enemy
            </h5>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">HP:</span>
                <span className="text-sm font-medium">
                  {goalContext?.memory?.enemyHealth || 0}/
                  {goalContext?.memory?.enemyMaxHealth || 0}
                </span>
              </div>
              <div className="w-full bg-muted  h-2 mt-1">
                <div
                  className="bg-red-500 h-2 "
                  style={{
                    width: `${
                      goalContext?.memory?.enemyHealth &&
                      goalContext?.memory?.enemyMaxHealth
                        ? (goalContext?.memory?.enemyHealth /
                            goalContext?.memory?.enemyMaxHealth) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm">Shield:</span>
                <span className="text-sm font-medium">
                  {goalContext?.memory?.enemyShield || 0}/
                  {goalContext?.memory?.enemyMaxShield || 0}
                </span>
              </div>
              <div className="w-full bg-muted  h-2 mt-1">
                <div
                  className="bg-purple-500 h-2 "
                  style={{
                    width: `${
                      goalContext?.memory?.enemyShield &&
                      goalContext?.memory?.enemyMaxShield
                        ? (goalContext?.memory?.enemyShield /
                            goalContext?.memory?.enemyMaxShield) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background/80 p-3 rounded-md">
          <h5 className="text-sm font-medium mb-2 text-primary/80 uppercase text-center bg-primary/10  ">
            Weapons
          </h5>
          <div className="grid grid-cols-3 gap-2">
            <div className="border-2 border-primary/20 rounded-md p-2 flex flex-col items-center">
              <div className="font-medium">
                ⚔️ x {goalContext?.memory?.rockCharges || 0}{" "}
              </div>
              <div className="text-sm mt-1 space-y-0.5 w-full">
                <div className="flex justify-between">
                  <span>ATK:</span>{" "}
                  <span>{goalContext?.memory?.rockAttack || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>DEF:</span>{" "}
                  <span>{goalContext?.memory?.rockDefense || 0}</span>
                </div>
              </div>
            </div>
            <div className="border-2 border-primary/20 rounded-md p-2 flex flex-col items-center">
              <div className="font-medium">
                🛡️ x {goalContext?.memory?.paperCharges || 0}
              </div>
              <div className="text-sm mt-1 space-y-0.5 w-full">
                <div className="flex justify-between">
                  <span>ATK:</span>{" "}
                  <span>{goalContext?.memory?.paperAttack || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>DEF:</span>{" "}
                  <span>{goalContext?.memory?.paperDefense || 0}</span>
                </div>
              </div>
            </div>
            <div className="border-2 border-primary/20 rounded-md p-2 flex flex-col items-center">
              <div className="font-medium">
                ✨ x {goalContext?.memory?.scissorCharges || 0}
              </div>
              <div className="text-sm mt-1 space-y-0.5 w-full">
                <div className="flex justify-between">
                  <span>ATK:</span>{" "}
                  <span>{goalContext?.memory?.scissorAttack || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>DEF:</span>{" "}
                  <span>{goalContext?.memory?.scissorDefense || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

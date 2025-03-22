import { Card } from "@/components/ui/card";

interface GameStatusProps {
  goalContext: any;
}

export function GameStatus({ goalContext }: GameStatusProps) {
  return (
    <Card className="p-4 mb-4 border-2 border-primary/20 bg-primary/5">
      <h4 className="text-base font-semibold mb-3 text-primary">Game State</h4>
      <div className="space-y-3">
        <div className="bg-background/80 p-3 rounded-md">
          <h5 className="text-sm font-medium mb-2 text-primary/80">Location</h5>
          <div className="flex items-center justify-between">
            <span className="text-sm">Room:</span>
            <span className="text-sm font-medium">
              {goalContext?.memory?.currentRoom || "Unknown"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Dungeon:</span>
            <span className="text-sm font-medium">
              {goalContext?.memory?.currentDungeon || "Unknown"}
            </span>
          </div>
        </div>

        <div className="bg-background/80 p-3 rounded-md">
          <h5 className="text-sm font-medium mb-2 text-primary/80">
            Battle Status
          </h5>
          <div className="text-sm">
            {goalContext?.memory?.lastBattleResult ? (
              <>
                <div className="flex items-center justify-between">
                  <span>Result:</span>
                  <span className="font-medium">
                    {goalContext?.memory?.lastBattleResult}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Enemy Move:</span>
                  <span className="font-medium">
                    {goalContext?.memory?.lastEnemyMove}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">No battles yet</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background/80 p-3 rounded-md">
            <h5 className="text-sm font-medium mb-2 text-primary/80">Player</h5>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">HP:</span>
                <span className="text-sm font-medium">
                  {goalContext?.memory?.playerHealth || 0}/
                  {goalContext?.memory?.playerMaxHealth || 0}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div
                  className="bg-green-500 h-2 rounded-full"
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
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div
                  className="bg-blue-500 h-2 rounded-full"
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
            <h5 className="text-sm font-medium mb-2 text-primary/80">Enemy</h5>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">HP:</span>
                <span className="text-sm font-medium">
                  {goalContext?.memory?.enemyHealth || 0}/
                  {goalContext?.memory?.enemyMaxHealth || 0}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div
                  className="bg-red-500 h-2 rounded-full"
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
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div
                  className="bg-purple-500 h-2 rounded-full"
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
          <h5 className="text-sm font-medium mb-2 text-primary/80">Weapons</h5>
          <div className="grid grid-cols-3 gap-2">
            <div className="border rounded-md p-2 text-center">
              <div className="font-medium">Rock</div>
              <div className="text-xs mt-1">
                <div>ATK: {goalContext?.memory?.rockAttack || 0}</div>
                <div>DEF: {goalContext?.memory?.rockDefense || 0}</div>
                <div>Charges: {goalContext?.memory?.rockCharges || 0}</div>
              </div>
            </div>
            <div className="border rounded-md p-2 text-center">
              <div className="font-medium">Paper</div>
              <div className="text-xs mt-1">
                <div>ATK: {goalContext?.memory?.paperAttack || 0}</div>
                <div>DEF: {goalContext?.memory?.paperDefense || 0}</div>
                <div>Charges: {goalContext?.memory?.paperCharges || 0}</div>
              </div>
            </div>
            <div className="border rounded-md p-2 text-center">
              <div className="font-medium">Scissor</div>
              <div className="text-xs mt-1">
                <div>ATK: {goalContext?.memory?.scissorAttack || 0}</div>
                <div>DEF: {goalContext?.memory?.scissorDefense || 0}</div>
                <div>Charges: {goalContext?.memory?.scissorCharges || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background/80 p-3 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Loot Phase:</span>
            <span className="text-sm">
              {goalContext?.memory?.lootPhase || "None"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

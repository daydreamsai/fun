import { Card } from "@/components/ui/card";
import { ContextState } from "@daydreamsai/core";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { MAX_ENERGY } from "../client/GameClient";
import { GigaverseContext, GigaverseDungeonState } from "../context";
import { Player } from "../client/types/game";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  state: ContextState<GigaverseContext> | undefined;
  lastUpdated: number;
  refresh: () => void;
}

function perc(current: number, max: number) {
  return current && max ? (current / max) * 100 : 0;
}

export function OverviewTab({ state, refresh }: OverviewTabProps) {
  if (!state) return null;

  const { energy, dungeon } = state.memory;

  return (
    <div className="">
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium uppercase">Energy</span>
          <span className="text-sm">
            {energy.toFixed(1)} / {MAX_ENERGY}
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
              width: `${Math.min(100, perc(energy, 240))}%`,
            }}
          ></div>
        </div>
      </div>
      {dungeon && <DungeoState state={dungeon} />}
    </div>
  );
}

function DungeoState({ state }: { state: GigaverseDungeonState }) {
  return (
    <>
      <div className="py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium uppercase">Loot Available</span>
          <span className="text-sm">{state.lootPhase || "None"}</span>
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
              {state.currentRoom || "Unknown"}
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground uppercase">
              Dungeon id
            </span>
            <div className="text-2xl font-medium">
              {state.currentDungeon || "Unknown"}
            </div>
          </div>
        </div>
      </div>

      <div className="py-2">
        <h5 className="text-sm font-medium mb-2 text-secondary-foreground uppercase text-center bg-secondary">
          Last Move Status
        </h5>
        <div className="text-sm">
          {state.lastBattleResult ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-sm text-muted-foreground uppercase">
                  Player
                </span>
                <div className="text-lg font-medium uppercase">
                  {state.player.lastMove}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground uppercase">
                  Result
                </span>
                <div className="text-lg font-medium uppercase">
                  {state.lastBattleResult}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground uppercase">
                  Enemy
                </span>
                <div className="text-lg font-medium uppercase">
                  {state.enemy.lastMove}
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
        <Stats
          title="Player"
          player={state.player}
          colors={{ hp: "bg-green-600/80", shield: "bg-blue-600/80" }}
        />
        <Stats
          title="Enemy"
          player={state.enemy}
          colors={{ hp: "bg-red-600/80", shield: "bg-purple-600/80" }}
        />
      </div>
      <Weapons player={state.player} title="Weapons" />
      <Weapons player={state.enemy} title="Enemy Weapons" />
    </>
  );
}

function Stats({
  title,
  player,
  colors,
}: {
  title: string;
  player: Player;
  colors: { hp: string; shield: string };
}) {
  return (
    <div className="">
      <h5 className="text-sm font-medium mb-2 text-secondary-foreground uppercase text-center bg-secondary">
        {title}
      </h5>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm">HP:</span>
          <span className="text-sm font-medium">
            {player.health.current}/{player.health.currentMax}
          </span>
        </div>
        <div className="w-full bg-muted  h-2 mt-1">
          <div
            className={cn("h-2", colors.hp)}
            style={{
              width: `${perc(player.health.current, player.health.currentMax)}%`,
            }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm">Shield:</span>
          <span className="text-sm font-medium">
            {player.shield.current}/{player.shield.currentMax}
          </span>
        </div>
        <div className="w-full bg-muted  h-2 mt-1">
          <div
            className={cn("h-2", colors.shield)}
            style={{
              width: `${perc(player.shield.current, player.shield.currentMax)}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}

function Weapons({ title, player }: { title: string; player: Player }) {
  return (
    <div className="py-2">
      <h5 className="text-sm font-medium mb-2 uppercase text-center text-secondary-foreground bg-secondary">
        {title}
      </h5>
      <div className="grid grid-cols-3 gap-2">
        <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
          <div className="font-medium">⚔️ x {player.rock.currentCharges}</div>
          <div className="text-sm mt-1 space-y-0.5 w-full">
            <div className="flex justify-between">
              <span>ATK:</span>
              <span>{player.rock.currentATK}</span>
            </div>
            <div className="flex justify-between">
              <span>DEF:</span>
              <span>{player.rock.currentDEF}</span>
            </div>
          </div>
        </div>
        <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
          <div className="font-medium">🛡️ x {player.paper.currentCharges}</div>
          <div className="text-sm mt-1 space-y-0.5 w-full">
            <div className="flex justify-between">
              <span>ATK:</span>
              <span>{player.paper.currentATK}</span>
            </div>
            <div className="flex justify-between">
              <span>DEF:</span>
              <span>{player.paper.currentDEF}</span>
            </div>
          </div>
        </div>
        <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
          <div className="font-medium">
            ✨ x {player.scissor.currentCharges}
          </div>
          <div className="text-sm mt-1 space-y-0.5 w-full">
            <div className="flex justify-between">
              <span>ATK:</span>
              <span>{player.scissor.currentATK}</span>
            </div>
            <div className="flex justify-between">
              <span>DEF:</span>
              <span>{player.scissor.currentDEF}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

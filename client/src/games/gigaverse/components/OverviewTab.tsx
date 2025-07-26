import { ContextState } from "@daydreamsai/core";
import { Button } from "@/components/ui/button";
import { useState } from "react";

import { GigaverseContext } from "../context";
import { GameData, GigaverseDungeonState, Player } from "../client/types/game";
import { cn } from "@/lib/utils";

import {
  GetTodayResponse,
  SkillsProgressEntity,
} from "../client/types/responses";
import { useAgentStore } from "@/store/agentStore";
import { useNavigate } from "@tanstack/react-router";
import { perc } from "../utils";
import { Weapons } from "./Weapons";
import { Stats } from "./Stats";

export function OverviewTab({
  state,
}: {
  state: ContextState<GigaverseContext> | undefined;
  lastUpdated: number;
  refresh: () => void;
}) {
  if (!state) return null;

  const { dungeon } = state.memory;
  const { game } = state.options;
  const { player } = game;

  const energy = player.energy.entities[0].parsedData;

  // Calculate time until full energy
  const energyNeeded = energy.maxEnergy - energy.energyValue;
  const secondsUntilFull =
    energyNeeded > 0
      ? Math.ceil(energyNeeded / (energy.regenPerHour / 3600))
      : 0;
  const minutesUntilFull = Math.floor(secondsUntilFull / 60);
  const hoursUntilFull = Math.floor(minutesUntilFull / 60);
  const remainingMinutes = minutesUntilFull % 60;

  const playerHealth = dungeon?.player.health.current;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="">
        <h4 className="text-secondary-foreground uppercase text-center bg-secondary mb-2">
          Noob #{player.account.noob.docId}
        </h4>
        <div className="">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium uppercase">
              Energy{" "}
              <span className="text-xs text-muted-foreground animate-pulse">
                {energy.isPlayerJuiced ? "Juiced" : "Not Juiced"}
              </span>
            </span>
            <span className="text-sm text-center">
              {energy.energyValue} / {energy.maxEnergy}
            </span>
          </div>
          <div className="relative w-full bg-muted h-2.5 overflow-hidden">
            <div
              className={cn(
                "h-2.5 transition-all duration-500",
                energy.isPlayerJuiced ? "bg-accent animate-pulse" : "bg-primary"
              )}
              style={{
                width: `${Math.min(100, perc(energy.energyValue, energy.maxEnergy))}%`,
              }}
            />
            {/* Subtle regeneration indicator */}
            {energy.energyValue < energy.maxEnergy && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-x" />
            )}
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-muted-foreground">
              +{energy.regenPerHour}/h
            </span>
            {energy.energyValue < energy.maxEnergy && (
              <span className="text-xs text-muted-foreground">
                Full in{" "}
                {hoursUntilFull > 0
                  ? `${hoursUntilFull}h ${remainingMinutes}m`
                  : `${minutesUntilFull}m`}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* <JuiceStats juice={juice} /> */}

      {dungeon && game && playerHealth && playerHealth > 0 ? (
        <DungeonState state={dungeon} game={game} />
      ) : (
        <>
          <Dungeons
            state={state}
            today={game.today}
            skills={player.skills.entities}
          />
        </>
      )}
      <div className="text-sm space-y-2">
        <h4 className="text-secondary-foreground uppercase text-center bg-secondary">
          Player Info
        </h4>
        <div className="space-y-0.5">
          <div>{player.account.usernames[0].NAME_CID}</div>
          <div className="text-xs mt-0.5 text-muted-foreground">
            {player.account.noob.OWNER_CID}
          </div>
        </div>
        <div className="">Noob #{player.account.noob.docId}</div>
      </div>
      <div className="text-sm space-y-2">
        <h4 className="text-secondary-foreground uppercase text-center bg-secondary">
          Session Info
        </h4>
        <div className="space-y-0.5">
          <p>Session ID: {state.id.split(":").pop()}</p>
          <p>Started: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      {/* <div className="mt-2 flex gap-2">
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            refresh();
          }}
        >
          Refresh
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            refresh();
          }}
        >
          Start new Session
        </Button>
      </div> */}
    </div>
  );
}

const skillByDungeon: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
};

function Dungeons({
  state,
  today,
  skills,
}: {
  state: ContextState<GigaverseContext>;
  today: GetTodayResponse;
  skills: SkillsProgressEntity[];
}) {
  const { agent } = useAgentStore();
  const navigate = useNavigate({ from: "/games/gigaverse/$chatId" });
  const [loadingDungeons, setLoadingDungeons] = useState<Set<number>>(
    new Set()
  );

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-secondary-foreground uppercase text-center bg-secondary">
        Dungeons to run: {state.memory.gamesToPlay}
      </h4>
      <div className="flex flex-col gap-2 text-sm">
        {today.dungeonDataEntities.map((dungeon) => {
          const isCheckpointClear =
            dungeon.CHECKPOINT_CID > 0
              ? state.options.game.player.account.checkpointProgress.find(
                  (checkpoint) => checkpoint.ID_CID
                )?.COMPLETE_CID
              : true;
          return (
            <div key={dungeon.ID_CID} className="border-b pb-2">
              <div className="flex justify-between">
                <div className="font-medium uppercase">{dungeon.NAME_CID}</div>
                <div>Energy: {dungeon.ENERGY_CID}</div>
                <div>
                  Level:{" "}
                  {skills.find(
                    (skill) =>
                      skill.SKILL_CID === skillByDungeon[dungeon.ID_CID]
                  )?.LEVEL_CID ?? 0}
                </div>
              </div>

              <div className="flex gap-2 mt-2 mb-1 justify-between">
                <Button
                  size="sm"
                  className="w-full"
                  variant="secondary"
                  disabled={
                    !isCheckpointClear ||
                    state.options.game.player.energy.entities[0].parsedData
                      .energyValue < dungeon.ENERGY_CID ||
                    loadingDungeons.has(dungeon.ID_CID)
                  }
                  onClick={async () => {
                    // Set loading state
                    setLoadingDungeons((prev) =>
                      new Set(prev).add(dungeon.ID_CID)
                    );

                    // Clear loading state after 2 seconds
                    setTimeout(() => {
                      setLoadingDungeons((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(dungeon.ID_CID);
                        return newSet;
                      });
                    }, 2000);

                    await agent.send({
                      context: state.context,
                      args: state.args,
                      input: {
                        type: "message",
                        data: {
                          user: "player",
                          content:
                            "Lets play 1 game of " +
                            dungeon.NAME_CID +
                            "first add a game to play then start a new run",
                        },
                      },
                    });
                  }}
                >
                  {loadingDungeons.has(dungeon.ID_CID)
                    ? "Dungeon Started"
                    : "Play"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// function JuiceStats({ juice }: { juice: GetGigaJuiceResponse }) {
//   return (
//     <div>
//       <div className="flex justify-between items-center mb-1">
//         <span className="text-sm font-medium uppercase">Juice</span>
//         <span className="text-sm text-center">
//           {0} / {MAX_JUICE}
//         </span>
//       </div>
//       <div className="w-full bg-gray-200 h-2.5 dark:bg-gray-700">
//         <div
//           className="bg-green-500 h-2.5 animate-pulse"
//           style={{
//             width: `${Math.min(100, perc(0, 480))}%`,
//           }}
//         ></div>
//       </div>
//       <div className="grid grid-cols-2 gap-2 mt-4">
//         {juice.listings
//           ?.slice()
//           .sort((a, b) => (a.TIME_BETWEEN_CID > b.TIME_BETWEEN_CID ? 1 : -1))
//           .map((listing) => (
//             <div
//               key={listing.docId}
//               className="border aspect-square text-center p-4 flex flex-col"
//             >
//               <div>{listing.NAME_CID}</div>
//               <div className="mt-2">
//                 {listing.TIME_BETWEEN_CID / (24 * 60 * 60)} days
//               </div>
//               <div className="mt-auto flex flex-col">
//                 <Badge
//                   variant="secondary"
//                   className="rounded-none text-center justify-center"
//                 >
//                   {listing.ETH_MINT_PRICE_CID / 1e18} ETH
//                 </Badge>
//                 <Button>Get Juiced</Button>
//               </div>
//             </div>
//           ))}
//       </div>
//     </div>
//   );
// }

function DungeonState({
  state,
  game,
}: {
  state: GigaverseDungeonState;
  game: GameData;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
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
              Enemy
            </span>
            <div className="text-xl font-medium">
              {game.offchain.enemies[state.currentRoom].NAME_CID}
            </div>
          </div>
        </div>
      </div>

      <div>
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

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Stats
          title="Player"
          player={state.player}
          colors={{ hp: "bg-primary/80", shield: "bg-primary/80" }}
        />
        <Stats
          title="Enemy"
          player={state.enemy}
          colors={{ hp: "bg-destructive/80", shield: "bg-secondary/80" }}
        />
      </div>
      <Weapons player={state.player} title="Weapons" />
      <Weapons player={state.enemy} title="Enemy Weapons" />
    </div>
  );
}

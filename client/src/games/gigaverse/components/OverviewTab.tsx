import { ContextState } from "@daydreamsai/core";
import { Button } from "@/components/ui/button";

import { GameData, GigaverseContext, GigaverseDungeonState } from "../context";
import { Player } from "../client/types/game";
import { cn } from "@/lib/utils";

import {
  GetTodayResponse,
  SkillsProgressEntity,
} from "../client/types/responses";
import { useAgentStore } from "@/store/agentStore";
import { useNavigate } from "@tanstack/react-router";

interface OverviewTabProps {
  state: ContextState<GigaverseContext> | undefined;
  lastUpdated: number;
  refresh: () => void;
}

function perc(current: number, max: number) {
  return current && max ? (current / max) * 100 : 0;
}

// const chests = {
//   entities: [
//     {
//       docId: "Recipe#700000",
//       ID_CID: "700000",
//       NAME_CID: "Noob Chest",
//       FACTION_CID_array: [],
//       GEAR_TYPE_CID: 0,
//       DURABILITY_CID: 0,
//       TIER_CID: 0,
//       UINT256_CID: 0,
//       INPUT_NAMES_CID_array: [],
//       INPUT_ID_CID_array: [],
//       INPUT_AMOUNT_CID_array: [],
//       LOOT_ID_CID_array: [2, 21],
//       LOOT_AMOUNT_CID_array: [30, 1],
//       LOOT_FULFILLER_ID_CID_array: [
//         "75502504502920090138965878018173592913898371762662353957054979645271527284958",
//         "75502504502920090138965878018173592913898371762662353957054979645271527284958",
//       ],
//       TIME_BETWEEN_CID: 0,
//       TAG_CID_array: ["node"],
//       SUCCESS_RATE_CID: 100,
//       COOLDOWN_CID: 604800,
//       MAX_COMPLETIONS_CID: 0,
//       ENERGY_CID: 0,
//     },
//     {
//       docId: "Recipe#700001",
//       ID_CID: "700001",
//       NAME_CID: "Blue Pot 1",
//       FACTION_CID_array: [],
//       GEAR_TYPE_CID: 5,
//       DURABILITY_CID: 2,
//       TIER_CID: 1,
//       UINT256_CID: 4,
//       INPUT_NAMES_CID_array: [],
//       INPUT_ID_CID_array: [],
//       INPUT_AMOUNT_CID_array: [],
//       LOOT_ID_CID_array: [60],
//       LOOT_AMOUNT_CID_array: [1],
//       LOOT_FULFILLER_ID_CID_array: [
//         "53627656127806277773141899801706887938266705126509836268160347079208875429400",
//       ],
//       TIME_BETWEEN_CID: 0,
//       TAG_CID_array: ["node"],
//       SUCCESS_RATE_CID: 100,
//       COOLDOWN_CID: 259200,
//       MAX_COMPLETIONS_CID: 0,
//       ENERGY_CID: 5,
//     },
//     {
//       docId: "Recipe#700002",
//       ID_CID: "700002",
//       NAME_CID: "Tan Pot 1",
//       FACTION_CID_array: [],
//       GEAR_TYPE_CID: 5,
//       DURABILITY_CID: 2,
//       TIER_CID: 2,
//       UINT256_CID: 2,
//       INPUT_NAMES_CID_array: [],
//       INPUT_ID_CID_array: [],
//       INPUT_AMOUNT_CID_array: [],
//       LOOT_ID_CID_array: [61],
//       LOOT_AMOUNT_CID_array: [1],
//       LOOT_FULFILLER_ID_CID_array: [
//         "53627656127806277773141899801706887938266705126509836268160347079208875429400",
//       ],
//       TIME_BETWEEN_CID: 0,
//       TAG_CID_array: ["node"],
//       SUCCESS_RATE_CID: 100,
//       COOLDOWN_CID: 86400,
//       MAX_COMPLETIONS_CID: 0,
//       ENERGY_CID: 5,
//     },
//   ],
// };

export function OverviewTab({ state }: OverviewTabProps) {
  if (!state) return null;

  const { dungeon } = state.memory;
  const { game } = state.options;
  const { player } = game;

  const energy = state.memory.energy.entities[0].parsedData;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="">
        <h4 className="text-secondary-foreground uppercase text-center bg-secondary mb-2">
          Noob #{player.account.noob.docId}
        </h4>
        <div className="">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium uppercase">Energy</span>
            <span className="text-sm text-center">
              {energy.energyValue} / {energy.maxEnergy}
            </span>
          </div>
          <div className="w-full bg-gray-200 h-2.5 dark:bg-gray-700">
            <div
              className={cn(
                "h-2.5 animate-pulse",
                energy.isPlayerJuiced ? "bg-orange-500" : "bg-cyan-600"
              )}
              style={{
                width: `${Math.min(100, perc(energy.energyValue, energy.maxEnergy))}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
      {/* <JuiceStats juice={juice} /> */}

      {dungeon ? (
        <DungeoState state={dungeon} game={game} />
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

// function ChestAndPots() {
//   return (
//     <div>
//       <div className="bg-secondary mb-2 flex justify-center relative items-center">
//         <h4 className="text-secondary-foreground uppercase text-center">
//           Chests & Pots
//         </h4>
//         {/* <Button variant="ghost" size="icon" className="">
//             <ChevronDown />
//           </Button> */}
//       </div>
//       <div className="flex flex-col gap-2">
//         {chests.entities.map((chest) => (
//           <div key={chest.docId} className="flex gap-2 text-sm items-center">
//             <div>
//               <div>{chest.NAME_CID}</div>
//               <div className="flex gap-2 text-xs text-muted-foreground">
//                 <div>Tier: {chest.TIER_CID}</div>
//                 <div>Energy: {chest.ENERGY_CID}</div>
//               </div>
//             </div>
//             {/* <div>{chest.COOLDOWN_CID}</div> */}
//             <div className="ml-auto">
//               <Button className="" size="sm" variant="outline" disabled>
//                 Collect
//               </Button>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

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

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-secondary-foreground uppercase text-center bg-secondary">
        Dungeons
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
              <div className="flex justify-between my-1">
                {/* <div>134/146</div> */}
              </div>
              <div className="flex gap-2 mt-2 mb-1">
                {/* <Button size="sm" variant="outline" className="w-full">
              Stats
            </Button>
            */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigate({
                      search: {
                        sidebar: "skills",
                      },
                    });
                  }}
                >
                  Skills
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="w-full"
                  disabled={
                    !isCheckpointClear ||
                    state.memory.energy.entities[0].parsedData.energyValue <
                      dungeon.ENERGY_CID
                  }
                  onClick={async () => {
                    await agent.send({
                      context: state.context,
                      args: state.args,
                      input: {
                        type: "message",
                        data: {
                          user: "player",
                          content: "Lets play " + dungeon.NAME_CID,
                        },
                      },
                    });
                  }}
                >
                  Play
                </Button>
              </div>
            </div>
          );
        })}
        {/* <div>
          <div>Dungetron 5000</div>
          <div className="flex justify-between">
            <div>Lvl: 5</div>
            <div>134/146</div>
          </div>
          <div className="flex gap-2 mt-1">
            <Button variant="secondary" className="w-full">
              View Skills
            </Button>
            <Button variant="default" className="w-full" disabled>
              Play Dungeon
            </Button>
          </div>
        </div> */}
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

function DungeoState({
  state,
  game,
}: {
  state: GigaverseDungeonState;
  game: GameData;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* <div className="py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium uppercase">Loot Available</span>
          <span className="text-sm">{state.lootPhase || "None"}</span>
        </div>
      </div> */}
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
    </div>
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
    <div>
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

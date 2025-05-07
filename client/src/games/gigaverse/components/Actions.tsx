import { ActionCall, ActionResult } from "@daydreamsai/core";
import {
  Flag,
  Shield,
  Play,
  RefreshCw,
  PackageIcon,
  Package2Icon,
  GiftIcon,
  Sword,
  ShieldAlert,
  Stars,
} from "lucide-react";
import { LogContainer } from "@/components/chat/LogsLIst";
import { DungeonData, GameItemBalanceChange } from "../client/types/game";
import { GameData } from "../context";

// Helper function to render move icon
const renderMoveIcon = (move?: string) => {
  if (!move) return null;

  const iconClass = "h-4 w-4";

  switch (move) {
    case "rock":
      return <Sword className={`${iconClass} text-stone-500`} />;
    case "paper":
      return <ShieldAlert className={`${iconClass} text-blue-400`} />;
    case "scissor":
      return <Stars className={`${iconClass} text-violet-500`} />;
    case "loot_one":
      return <PackageIcon className={`${iconClass} text-amber-500`} />;
    case "loot_two":
      return <Package2Icon className={`${iconClass} text-emerald-500`} />;
    case "loot_three":
      return <GiftIcon className={`${iconClass} text-purple-500`} />;
    default:
      return null;
  }
};

const moveLabel: Record<string, string> = {
  rock: "Sword",
  paper: "Shield",
  scissor: "Spell",
};

function AttackAction({
  call,
  result,
  gameData,
}: {
  call: ActionCall;
  result?: ActionResult<{
    success: boolean;
    message: string;
    result: DungeonData;
    gameItemBalanceChanges?: GameItemBalanceChange[];
  }>;
  gameData?: GameData;
}) {
  if (!result) return null;

  if (!result.data.success) {
    return <div>{result.data.message}</div>;
  }

  const run = result?.data.result?.run;
  const lastMove = run?.players[1].lastMove;

  return run ? (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renderMoveIcon(call.data.action)}

          <span className="text-sm font-medium capitalize">
            {moveLabel[call.data.action]}
            {" VS "}
            {lastMove ? moveLabel[lastMove] : "?"}
          </span>
        </div>
        {run && (
          <div
            className={`ml-auto px-2 py-1 rounded text-xs uppercase font-bold ${
              run.players[0].thisPlayerWin
                ? "bg-green-500/10 text-green-500"
                : run.players[0].otherPlayerWin
                  ? "bg-red-500/10 text-red-500"
                  : "bg-yellow-500/10 text-yellow-500"
            }`}
          >
            {run.players[0].thisPlayerWin
              ? "win"
              : run.players[0].otherPlayerWin
                ? "lose"
                : "draw"}
          </div>
        )}
      </div>
      {gameData &&
        result?.data.gameItemBalanceChanges &&
        result?.data.gameItemBalanceChanges.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            <div>New items</div>
            <div className="flex gap-2">
              {result?.data.gameItemBalanceChanges.map((item, i) => {
                const itemData = gameData.offchain.gameItems.find(
                  (i) => parseInt(i.docId) === item.id
                );
                return (
                  <div className="text-center flex flex-col" key={i}>
                    <img
                      src={itemData?.IMG_URL_CID}
                      className="size-12 mb-2"
                    ></img>
                    <div>+{item.amount}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  ) : null;
  // (
  //   <div>{JSON.stringify({ result })}</div>
  // );
}

const lootIndexes: Record<string, number> = {
  loot_one: 0,
  loot_two: 1,
  loot_three: 2,
};

export function GigaverseAction({
  call,
  result,
  gameData,
}: {
  call: ActionCall;
  result?: ActionResult;
  gameData?: GameData;
}) {
  if (!call.data?.action) return null;

  return (
    <LogContainer className="pb-4">
      <div className="mb-2 text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between pt-2">
        Gigaverse
      </div>

      {call.name === "gigaverse.attackInDungeon" &&
        call.data.action.startsWith("loot") && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderMoveIcon(call.data.action)}
                <span className="text-sm font-medium capitalize">
                  {call.data.action.replace("_", " ")}
                </span>
                <span>
                  {result?.data?.previousLootOptions
                    ? `- ${
                        result?.data?.previousLootOptions?.[
                          lootIndexes[call.data.action]
                        ]?.boonTypeString
                      }`
                    : ""}
                </span>
              </div>
            </div>
            {/* <div className="flex mt-3 gap-2">
              {result?.data?.lootOptions?.map((i: any) => (
                <div className="aspect-square border size-24 text-xs flex flex-col items-center justify-center gap-1">
                  <div>{i.boonTypeString}</div>
                  <div>
                    ({i.selectedVal1}, {i.selectedVal2})
                  </div>
                </div>
              ))}
            </div> */}
            {/* <div>{JSON.stringify(result?.data?.lootOptions ?? [])}</div> */}
          </div>
        )}

      {call.name === "gigaverse.attackInDungeon" &&
        !call.data.action.startsWith("loot") && (
          <AttackAction call={call} result={result} gameData={gameData} />
        )}

      {call.name === "gigaverse.useItem" && call.data?.action && (
        <div className="flex justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {renderMoveIcon(call.data.action)}
              <div>Use item #{call.data.itemId}</div>
            </div>
          </div>

          {/* <div>{JSON.stringify(result?.data ?? {})}</div> */}
        </div>
      )}

      {call.name === "gigaverse.startNewRun" && (
        <div className="mt-2 flex items-center gap-2">
          <Play className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">New Run Started</span>
        </div>
      )}

      {call.name === "gigaverse.getPlayerState" && (
        <div className="p-3 bg-blue-500/5 rounded-md border border-blue-500/30 flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Player Status Updated</span>
        </div>
      )}

      {call.name === "gigaverse.getUpcomingEnemies" && (
        <div className="p-3 bg-purple-500/5 rounded-md border border-purple-500/30 flex items-center gap-2">
          <Flag className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Enemies Scouted</span>
        </div>
      )}

      {call.name === "gigaverse.manuallyUpdateState" && (
        <div className="p-3 bg-amber-500/5 rounded-md border border-amber-500/30 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Game State Updated</span>
        </div>
      )}
    </LogContainer>
  );
}

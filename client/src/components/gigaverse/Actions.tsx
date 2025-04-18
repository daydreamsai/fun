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
import { LogContainer } from "../chat/LogsLIst";

// Helper function to render move icon
const renderMoveIcon = (move?: string) => {
  if (!move) return null;

  const iconClass = "h-6 w-6";

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

export function GigaverseAction({
  call,
  result,
}: {
  call: ActionCall;
  result?: ActionResult;
}) {
  return (
    <LogContainer className="bg-card text-muted-foreground border hover:brightness-105">
      <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
        Gigaverse
      </div>

      {call.name === "gigaverse.attackInDungeon" && (
        <div className="mt-3 p-3 bg-primary/10 rounded-md border border-primary/50 flex justify-between">
          {call.data?.action && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderMoveIcon(call.data.action)}
                {call.data.action.startsWith("loot") ? (
                  <span className="text-sm font-medium capitalize">
                    {call.data.action.replace("_", " ")}
                  </span>
                ) : (
                  <span className="text-sm font-medium capitalize">
                    {call.data.action}
                    {" VS "}
                    {result?.data.result?.run.players[1].lastMove ?? "?"}
                  </span>
                )}
              </div>
            </div>
          )}
          {result?.data.result && (
            <div
              className={`px-2 py-1 rounded text-xs uppercase font-bold ${
                // ""
                result.data.result.run.players[0].thisPlayerWin
                  ? "bg-green-500/10 text-green-500"
                  : result.data.result.run.players[0].otherPlayerWin
                    ? "bg-red-500/10 text-red-500"
                    : "bg-yellow-500/10 text-yellow-500"
              }`}
            >
              {result.data.result.run.players[0].thisPlayerWin
                ? "win"
                : result.data.result.run.players[0].otherPlayerWin
                  ? "lose"
                  : "draw"}
            </div>
          )}
          {/* <div>{JSON.stringify(result?.data ?? {})}</div> */}
        </div>
      )}

      {call.name === "gigaverse.startNewRun" && (
        <div className="mt-3 p-3 bg-green-500/5 rounded-md border border-green-500/30 flex items-center gap-2">
          <Play className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium">New Run Started</span>
        </div>
      )}

      {call.name === "gigaverse.getPlayerState" && (
        <div className="mt-3 p-3 bg-blue-500/5 rounded-md border border-blue-500/30 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">Player Status Updated</span>
        </div>
      )}

      {call.name === "gigaverse.getUpcomingEnemies" && (
        <div className="mt-3 p-3 bg-purple-500/5 rounded-md border border-purple-500/30 flex items-center gap-2">
          <Flag className="h-5 w-5 text-purple-500" />
          <span className="text-sm font-medium">Enemies Scouted</span>
        </div>
      )}

      {call.name === "gigaverse.manuallyUpdateState" && (
        <div className="mt-3 p-3 bg-amber-500/5 rounded-md border border-amber-500/30 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-medium">Game State Updated</span>
        </div>
      )}
    </LogContainer>
  );
}

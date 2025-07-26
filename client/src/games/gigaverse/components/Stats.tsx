import { cn } from "@/lib/utils";
import { perc } from "../utils";
import { Player } from "../client/types/game";

export function Stats({
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

import { Player } from "../client/types/game";
import { cn } from "@/lib/utils";

const weaponData = [
  { icon: "⚔️", key: "rock" as const, label: "Sword" },
  { icon: "🛡️", key: "paper" as const, label: "Shield" },
  { icon: "✨", key: "scissor" as const, label: "Magic" },
];

export function Weapons({ title, player }: { title: string; player: Player }) {
  return (
    <div className="w-full">
      <h5 className="text-sm font-medium mb-3 uppercase text-center text-secondary-foreground bg-secondary p-1.5">
        {title}
      </h5>
      <div className="grid grid-cols-3 gap-2">
        {weaponData.map(({ icon, key, label }) => {
          const weapon = player[key];
          const isActive = weapon.currentCharges > 0;

          return (
            <div
              key={key}
              className={cn(
                "relative group transition-all duration-200",
                "border rounded-sm overflow-hidden",
                "hover:shadow-md hover:scale-[1.02]",
                isActive
                  ? "border-border bg-card"
                  : "border-muted bg-muted/50 opacity-60"
              )}
            >
              <div className="p-3 space-y-2">
                <div className="text-center">
                  <span className="text-2xl block mb-1 transition-transform group-hover:scale-110">
                    {icon}
                  </span>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {label}
                  </div>
                  <div
                    className={cn(
                      "font-semibold text-sm mt-1",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    x{weapon.currentCharges}
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-border/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">ATK</span>
                    <span
                      className={cn(
                        "font-mono font-medium",
                        weapon.currentATK > 0
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {weapon.currentATK}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">DEF</span>
                    <span
                      className={cn(
                        "font-mono font-medium",
                        weapon.currentDEF > 0
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {weapon.currentDEF}
                    </span>
                  </div>
                </div>
              </div>

              {isActive && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/50" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

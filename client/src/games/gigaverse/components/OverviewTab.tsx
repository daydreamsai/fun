import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { cn } from "@/lib/utils";
import { perc } from "../utils";
import { Dungeons, DungeonState } from "./Dungeons";
import { Startup } from "./Startup";
import { ListRestart } from "lucide-react";

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
        <h4 className="text-secondary-foreground uppercase text-center bg-secondary mb-2 flex items-center justify-between px-2">
          Noob #{player.account.noob.docId}
          <button onClick={() => {}}>
            <ListRestart />
          </button>
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
        <Startup state={state} />
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

import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { DungeonState } from "./Dungeons";
import { Startup } from "./Startup";

interface UpdateStats {
  lastUpdateTime: number;
  pendingUpdates: number;
  totalUpdates: number;
  isUpdating: boolean;
}

export function OverviewTab({
  state,
  lastUpdated,
  refresh,
  updateStats,
}: {
  state: ContextState<GigaverseContext> | undefined;
  lastUpdated: number;
  refresh: () => void;
  updateStats?: UpdateStats;
}) {
  if (!state) return null;

  const { dungeon } = state.memory;
  const { game } = state.options;

  const playerHealth = dungeon?.player.health.current;

  return (
    <div className="space-y-3">
      {/* Player Info Card */}
      <div className="p-4 border rounded-lg bg-card">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h4 className="text-lg font-semibold">Noob #{state.options.game.player.account.noob.docId}</h4>
            <span className="text-sm bg-primary/10 px-2 py-0.5 rounded">
              {state.options.game.player.energy.entities[0].parsedData.isPlayerJuiced ? "Juiced" : "Standard"}
            </span>
            <span className="text-sm text-muted-foreground">Lv.{state.options.game.player.account.noob.LEVEL_CID}</span>
          </div>
          
          {/* Energy Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Energy:</span>
              <div className="flex-1 flex justify-between text-sm">
                <span>{state.options.game.player.energy.entities[0].parsedData.energyValue} / {state.options.game.player.energy.entities[0].parsedData.maxEnergy}</span>
                <span className="text-muted-foreground">+{state.options.game.player.energy.entities[0].parsedData.regenPerHour}/h</span>
              </div>
            </div>
            
            {/* Energy Bar */}
            <div className="relative w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className={`h-2 transition-all duration-500 rounded-full ${
                  state.options.game.player.energy.entities[0].parsedData.isPlayerJuiced ? "bg-accent" : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(100, (state.options.game.player.energy.entities[0].parsedData.energyValue / state.options.game.player.energy.entities[0].parsedData.maxEnergy) * 100)}%`,
                }}
              />
            </div>
            
            {/* Time until full */}
            {(() => {
              const energy = state.options.game.player.energy.entities[0].parsedData;
              const energyNeeded = energy.maxEnergy - energy.energyValue;
              if (energyNeeded > 0) {
                const secondsUntilFull = Math.ceil(energyNeeded / (energy.regenPerHour / 3600));
                const minutesUntilFull = Math.floor(secondsUntilFull / 60);
                const hoursUntilFull = Math.floor(minutesUntilFull / 60);
                const remainingMinutes = minutesUntilFull % 60;
                return (
                  <div className="text-sm text-muted-foreground text-right">
                    {hoursUntilFull > 0 ? `${hoursUntilFull}h ${remainingMinutes}m` : `${minutesUntilFull}m`} until full
                  </div>
                );
              }
              return null;
            })()}
          </div>
          
          {/* Player Details */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{state.options.game.player.account.usernames[0].NAME_CID}</span>
            <span className="text-muted-foreground">{state.options.game.player.account.noob.OWNER_CID.substring(0, 10)}...</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Session: {state.id.split(":").pop()?.substring(0, 8)}</span>
            <span>Last Update: {new Date(lastUpdated).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Always show Startup - dungeon info is now in right panel */}
      <Startup state={state} />
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

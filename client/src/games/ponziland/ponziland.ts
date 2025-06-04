import { context, render } from "@daydreamsai/core";
import { z } from "zod";
import * as client from "./client/querys";
import { bid } from "./actions/bid";
import { buy } from "./actions/buy";
import { increase_price, level_up, increase_stake } from "./actions/misc";
import { swap } from "./actions/swap";
import { RpcProvider } from "starknet";
import { useSettingsStore } from "@/store/settingsStore";
import docs from "./docs/main.md?raw";

// export const provider = new RpcProvider({
//   nodeUrl: import.meta.env.VITE_PUBLIC_NODE_URL!,
// });

// export const ponziland_check = (chain: StarknetChain) =>
//   input({
//     schema: z.object({
//       text: z.string(),
//     }),
//     subscribe(send, { container }) {
//       // Check mentions every minute
//       let index = 0;
//       let timeout: ReturnType<typeof setTimeout>;

//       // Function to schedule the next thought with random timing
//       const scheduleNextThought = async () => {
//         // Random delay between 3 and 10 minutes (180000-600000 ms)
//         const minDelay = 300000; // 3 minutes
//         const maxDelay = 400000; // 10 minutes
//         const randomDelay =
//           Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

//         console.log(
//           `Scheduling next ponziland check in ${randomDelay / 60000} minutes`
//         );

//         timeout = setTimeout(async () => {
//           let text = `Decide what action to take in ponziland, if any`;

//           let goal = "Build your bitcoin empire in ponziland";

//           let lands = await get_lands(env.STARKNET_ADDRESS!);
//           let balance = await get_balances();

//           let context = await CONTEXT();

//           let context = {
//             id: "ponziland",
//             lands: lands,
//             balance: balance,
//             goal: goal,
//             context: context,
//           };

//           console.log("ponziland context", context);

//           send(ponzilandContext, context, { text });
//           index += 1;

//           // Schedule the next thought
//           scheduleNextThought();
//         }, randomDelay);
//       };

//       // Start the first thought cycle
//       scheduleNextThought();

//       return () => clearTimeout(timeout);
//     },
//   });

// export const ponziland = (chain: StarknetChain) => {
//   return extension({
//     name: "ponziland",
//     contexts: {
//       ponziland: ponzilandContext,
//     },
//     inputs: {
//       //   "ponziland_check": ponziland_check(chain),
//     },
//     actions: [
//       get_owned_lands(chain),
//       get_auctions(chain),
//       get_claims(chain),
//       get_neighbors(chain),
//       get_all_lands(chain),
//       get_context(chain),
//       get_balances(chain),
//       bid(chain),
//       buy(chain),
//       level_up(chain),
//       increase_stake(chain),
//       increase_price(chain),
//       get_auction_yield(chain),
//       claim_all(chain),
//       swap(chain),
//       get_player_lands(chain),
//     ],
//   });
// };

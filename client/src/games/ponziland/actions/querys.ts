import { action } from "@daydreamsai/core";
import { z } from "zod";
import * as queries from "../client/querys";

export const get_auctions = action({
  name: "ponziland.get-auctions",
  description: "Get all of the active auctions",
  async handler(ctx) {
    return await queries.get_auctions(ctx.options);
  },
});

export const get_prices = action({
  name: "ponziland.get-prices",
  description: "Get the current prices of all tokens in ponziland",
  async handler() {
    return await queries.get_prices();
  },
});

export const get_claims = action({
  name: "ponziland.get-claims",
  description:
    "Get all of the claims in ponziland. Remember this expects no arguments",
  async handler(ctx) {
    //todo
    const claims = await queries.get_claims(
      ctx.options.account.address,
      ctx.options
    );
    return claims;
  },
});

export const get_neighbors = action({
  name: "ponziland.get-neighbors",
  description:
    "Get all of your lands neighbors in ponziland. Remember this expects a location argument",
  schema: z.object({ location: z.number() }),
  async handler(data, ctx) {
    //todo
    const neighbors = await queries.get_neighbors(
      data.location,
      ctx.options.account.address
    );

    // if (neighbors == "") {
    //   return (
    //     "Failed to get neighbors for location " +
    //     location +
    //     ". land may not exist."
    //   );
    // }

    return neighbors;
  },
});

export const get_all_lands = action({
  name: "ponziland.get-all-lands",
  description: "Get all of the lands in ponziland",
  async handler(ctx) {
    const lands = await queries.get_all_lands(ctx.options.account.address);

    console.log("lands", lands);

    return lands;
  },
});

export const get_context = action({
  name: "ponziland.get-context",
  description:
    "Get general information about Ponziland. This should be called first before attempting any other ponziland actions. The content for this action should always be {}",
  async handler(ctx) {
    // const res = await CONTEXT();
    // console.log("res", res);
    // return res;
    return {};
  },
});

// export const get_auction_yield = action({
//   name: "ponziland.get-auction-yield",
//   description:
//     "Get the potential yield of a land that is up for auction. This expects a location argument. This should be called to evaluate auctions before deciding to bid or not,.",
//   schema: z.object({ location: z.number() }),
//   async handler(data, ctx) {
//     const info = await queries.get_auction_yield(data.location, ctx.options);

//     return info;
//   },
// });

// export const get_player_lands = action({
//   name: "ponziland.get-player-lands",
//   description:
//     "Get all of the lands that a player owns in ponziland. This expects a starknet address argument",
//   schema: z.object({ address: z.string() }),
//   async handler(data: { address: string }, ctx) {
//     const res = await queries.get_lands(data.address, ctx.options);
//     return res;
//   },
// });

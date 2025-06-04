import { action } from "@daydreamsai/core";
import { z } from "zod";
import { CallData, cairo } from "starknet";
import type { Call } from "starknet";
import { indexToPosition } from "../utils/utils";
import { get_lands } from "../client/querys";
import { manifest, ponziland_address } from "../constants";
import { ponzilandContext } from "../context";

export const level_up = action({
  context: ponzilandContext,
  name: "ponziland.level-up",
  description: "Level up a land",
  schema: {
    land_location: z.string().describe("Location of the land to level up"),
  },
  async handler(data, { options: { account } }) {
    const calls = [];

    const level_up_call: Call = {
      contractAddress: ponziland_address,
      entrypoint: "level_up",
      calldata: CallData.compile({ land_location: data.land_location }),
    };

    calls.push(level_up_call);

    const res = await account.execute(calls);

    return {
      res,
      str:
        "Leveled up land " +
        Number(data.land_location) +
        " at " +
        indexToPosition(Number(data.land_location))[0] +
        "," +
        indexToPosition(Number(data.land_location))[1],
    };
  },
});

export const increase_stake = action({
  context: ponzilandContext,
  name: "ponziland.increase-stake",
  description:
    "Increase the stake for your lands. These amounts should always be 10 < amount < 20 tokens, x10^18 of course so to increase stake with 10 toke pass in 10000000000000000000",
  schema: {
    calls: z
      .array(
        z.object({
          land_location: z
            .string()
            .describe("Location of the land to increase stake on"),
          amount: z
            .string()
            .describe("The new stake amount (in wei, so x10^18)"),
        })
      )
      .describe(
        "The locations and amounts of the lands you are increasing the stake for"
      ),
  },
  async handler(data, ctx) {
    const tokenAmounts: { [tokenAddress: string]: bigint } = {};
    const ponziland_address = manifest.contracts[0].address;
    const { lands } = await get_lands(ctx.options.address, ctx.options);

    let calls = [];
    // First pass: collect all increase_stake calls and track token amounts
    for (const call of data.calls) {
      let land;
      for (const l of lands) {
        if (Number(l.location) == Number(call.land_location)) {
          land = l;
          break;
        }
      }
      if (!land) continue;

      const token_address = land.token_used;
      console.log("token_address", token_address);

      // Track total amount needed for each token
      if (!tokenAmounts[token_address]) {
        tokenAmounts[token_address] = BigInt(0);
      }
      tokenAmounts[token_address] += BigInt(call.amount);

      // Add the increase_stake call
      const increase_stake_call: Call = {
        contractAddress: ponziland_address,
        entrypoint: "increase_stake",
        calldata: CallData.compile({
          land_location: call.land_location,
          amount: cairo.uint256(call.amount),
        }),
      };
      calls.push(increase_stake_call);
    }

    // Second pass: add bundled approve calls at the beginning
    const approveCalls: Call[] = [];
    for (const [token_address, totalAmount] of Object.entries(tokenAmounts)) {
      const approve_call: Call = {
        contractAddress: token_address,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: ponziland_address,
          amount: cairo.uint256(totalAmount.toString()),
        }),
      };
      approveCalls.push(approve_call);
    }

    // Prepend approve calls to the beginning of the calls array
    calls = [...approveCalls, ...calls];

    const res = await ctx.options.chain.write(calls);
    console.log("res", res);

    const str =
      "Increased stake on lands " +
      data.calls
        .map(
          (c) =>
            indexToPosition(Number(c.land_location))[0] +
            "," +
            indexToPosition(Number(c.land_location))[1]
        )
        .join(", ");

    return { res, str };
  },
});

export const increase_price = action({
  context: ponzilandContext,
  name: "ponziland.increase-price",
  description: "Increase the price of a land",
  schema: z.object({
    land_location: z
      .string()
      .describe(
        "Location of the land to increase price on. Make sure this is a land you own."
      ),
    amount: z.string().describe("The new price amount (in wei, so x10^18)"),
  }),
  async handler(data, ctx) {
    const calls = [];

    const ponziland_address = manifest.contracts[0].address;

    const increase_price_call: Call = {
      contractAddress: ponziland_address,
      entrypoint: "increase_price",
      calldata: CallData.compile({
        land_location: data.land_location,
        amount: cairo.uint256(data.amount),
      }),
    };

    calls.push(increase_price_call);

    const res = await ctx.options.chain.write(calls);

    return {
      res,
      str:
        "Increased price on land " +
        Number(data.land_location) +
        " at " +
        indexToPosition(Number(data.land_location))[0] +
        "," +
        indexToPosition(Number(data.land_location))[1],
    };
  },
});

import { action } from "@daydreamsai/core";
import { z } from "zod";
import { CallData, cairo } from "starknet";
import { type Call } from "starknet";
import { indexToPosition } from "../utils/utils";
import { estark_address, ponziland_address } from "../constants";
import { ponzilandContext } from "../context";

export const bid = action({
  context: ponzilandContext,
  name: "ponziland.bid",
  description: "Bid on an auction",
  schema: {
    land_location: z.string().describe("Location of the land to bid on"),
    token_for_sale: z
      .string()
      .describe(
        "The *Contract address* of the token to be used for the stake and new listing. This can be found by querying your balances. This should be a token in your walconst that you have enough of."
      ),
    sell_price: z
      .string()
      .describe(
        "The price the land will be listed for after the auction ends (in wei, so x10^18)"
      ),
    amount_to_stake: z
      .string()
      .describe(
        "The amount to be staked to pay the lands taxes (in wei, so x10^18)"
      ),
  },
  async handler(data, ctx, agent) {
    const calls = [];

    // const { abi: token_abi } = await provider.getClassAt(data.token_for_sale);
    // const { abi: estark_abi } = await provider.getClassAt(estark_address);

    const price = await ctx.options.ponziLandContract.get_current_auction_price(
      data.land_location
    );

    if (data.token_for_sale == estark_address) {
      const estark_call: Call = {
        contractAddress: estark_address,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: ponziland_address,
          amount: cairo.uint256(data.amount_to_stake + price),
        }),
      };
      calls.push(estark_call);
    } else {
      const estark_call: Call = {
        contractAddress: estark_address,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: ponziland_address,
          amount: cairo.uint256(price),
        }),
      };
      const stake_approve_call: Call = {
        contractAddress: data.token_for_sale,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: ponziland_address,
          amount: cairo.uint256(data.amount_to_stake),
        }),
      };
      calls.push(estark_call);
      calls.push(stake_approve_call);
    }

    const bid_call: Call = {
      contractAddress: ponziland_address,
      entrypoint: "bid",
      calldata: CallData.compile({
        land_location: data.land_location,
        token_for_sale: data.token_for_sale,
        sell_price: cairo.uint256(data.sell_price),
        amount_to_stake: cairo.uint256(data.amount_to_stake),
      }),
    };

    calls.push(bid_call);

    const res = await ctx.options.account.execute(calls);

    return {
      res,
      str:
        "Bid on land " +
        Number(data.land_location) +
        " at " +
        indexToPosition(Number(data.land_location))[0] +
        "," +
        indexToPosition(Number(data.land_location))[1],
    };
  },
});

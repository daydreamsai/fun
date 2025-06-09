import { action } from "@daydreamsai/core";
import { z } from "zod";
import { CallData, cairo, num } from "starknet";
import type { Call } from "starknet";
import { indexToPosition } from "../utils/utils";
import { ponziland_address } from "../constants";
import { ponzilandContext } from "../context";

export const buy = action({
  context: ponzilandContext,
  name: "ponziland.buy",
  description: "Buy a land",
  schema: z.object({
    land_location: z.string().describe("Location of the land to buy"),
    token_for_sale: z
      .string()
      .describe(
        "Contract address of the token to be used for the purchase. This should be a token in your wallet that you have enough of."
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
  }),
  async handler(data, ctx, agent) {
    const calls = [];

    const land = await ctx.options.ponziLandContract.get_land(
      data.land_location
    );

    const balance = await ctx.options.provider.callContract({
      contractAddress: data.token_for_sale,
      entrypoint: "balanceOf",
      calldata: CallData.compile({ address: ctx.options.account?.address! }),
    });

    const token = num.toHexString(land[0].token_used);

    // Handle both hex and decimal formats for sell_price due to indexer quirk
    const rawPrice = land[0].sell_price;
    let price: number;

    if (typeof rawPrice === "string" && /[a-fA-F]/.test(rawPrice)) {
      // It's hexadecimal format
      price = parseInt(rawPrice, 16);
    } else {
      // It's decimal format
      price = Number(rawPrice);
    }

    console.log("price", BigInt(price));
    console.log("balance", BigInt(balance[0]));

    if (BigInt(balance[0]) < BigInt(price)) {
      return {
        res: null,
        str:
          "Not enough balance of " +
          data.token_for_sale +
          " to buy land " +
          data.land_location,
      };
    }

    if (token == data.token_for_sale) {
      const approve_call: Call = {
        contractAddress: data.token_for_sale,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: ponziland_address,
          amount: cairo.uint256(
            Math.floor((Number(price) + Number(data.amount_to_stake)) * 1.5)
          ),
        }),
      };
      calls.push(approve_call);
    } else {
      const token_call: Call = {
        contractAddress: data.token_for_sale,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: ponziland_address,
          amount: cairo.uint256(Math.floor(Number(data.amount_to_stake) * 1.5)),
        }),
      };
      const sale_call: Call = {
        contractAddress: token,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: ponziland_address,
          amount: cairo.uint256(Math.floor(Number(price) * 1.5)),
        }),
      };
      calls.push(token_call);
      calls.push(sale_call);
    }

    const buy_call: Call = {
      contractAddress: ponziland_address,
      entrypoint: "buy",
      calldata: CallData.compile({
        land_location: data.land_location,
        token_for_sale: data.token_for_sale,
        sell_price: cairo.uint256(data.sell_price),
        amount_to_stake: cairo.uint256(data.amount_to_stake),
      }),
    };

    calls.push(buy_call);

    const res = await ctx.options.account?.execute(calls);

    const waitTx = await ctx.options.account?.waitForTransaction(
      res?.transaction_hash!
    );

    if (waitTx?.isRejected()) {
      return {
        res: waitTx.transaction_failure_reason,
        str: "Transaction failed",
      };
    }

    if (waitTx?.isReverted()) {
      return {
        res: waitTx.revert_reason,
        str: "Transaction failed",
      };
    }

    return {
      res,
      str:
        "Bought land " +
        Number(data.land_location) +
        " at " +
        indexToPosition(Number(data.land_location))[0] +
        "," +
        indexToPosition(Number(data.land_location))[1],
    };
  },
});

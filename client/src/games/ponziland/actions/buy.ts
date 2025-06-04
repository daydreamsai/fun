import { action } from "@daydreamsai/core";
import { z } from "zod";
import { CallData, cairo } from "starknet";
import type { Call } from "starknet";
import { indexToPosition } from "../utils/utils";
import { useSettingsStore } from "@/store/settingsStore";
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
    const { cartridgeAccount } = useSettingsStore.getState();
    const calls = [];

    const land = await ctx.options.ponziLandContract.get_land(
      data.land_location
    );

    const balance = await ctx.options.provider.callContract({
      contractAddress: data.token_for_sale,
      entrypoint: "balanceOf",
      calldata: CallData.compile({ address: cartridgeAccount?.address! }),
    });

    const token = land[0].token_used;
    const price = land[0].sell_price;

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

    console.log("land", land);
    console.log("land 0", land[0]);
    console.log("price", price);

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

    const res = await cartridgeAccount?.execute(calls);

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

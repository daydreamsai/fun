import { action } from "@daydreamsai/core";
import { z } from "zod";
import { CallData } from "starknet";
import { type Call } from "starknet";
import { indexToPosition } from "../utils/utils";
import { ponziland_address } from "../constants";
import { ponzilandContext } from "../context";

export const claimAll = action({
  context: ponzilandContext,
  name: "ponziland.claim_all",
  description: "Claim all taxes from all your lands",
  schema: {
    land_location: z
      .array(z.string())
      .describe("Location of the land to claim from"),
  },
  async handler(data, ctx, agent) {
    const calls = [];

    let claim_call: Call = {
      contractAddress: ponziland_address,
      entrypoint: "claim_all",
      calldata: CallData.compile({ locations: data.land_location }),
    };

    calls.push(claim_call);

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
        "Bid on land " +
        Number(data.land_location) +
        " at " +
        indexToPosition(Number(data.land_location))[0] +
        "," +
        indexToPosition(Number(data.land_location))[1],
    };
  },
});

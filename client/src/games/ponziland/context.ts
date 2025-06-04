import { context } from "@daydreamsai/core";
import { z } from "zod";
import * as client from "./client";
import { getAllTokensFromAPI } from "./client/ponziland_api";

export async function fetchState(address: string, ctx: client.ClientsContext) {
  const tokens = await getAllTokensFromAPI();
  const balance = await client.get_balances(address, tokens, ctx);
  const auctions = await client.get_auctions(ctx);
  const land = await client.get_lands(address, tokens, ctx);
  const claims = await client.get_claims(address, ctx);
  return { tokens, balance, auctions, land, claims };
}

export const ponzilandContext = context({
  type: "ponziland",
  schema: {
    id: z.string(),
  },
  key: ({ id }) => id,
  instructions: "Build your bitcoin empire in ponziland",
  setup: () => {
    const { account, address, ...ctx } = client.createClientsContext();
    if (!account || !address) throw new Error("no account");
    return {
      account,
      address,
      ...ctx,
    };
  },
  async create({ options: { account, address, ...ctx } }) {
    const { tokens, auctions, balance, claims, land } = await fetchState(
      address,
      ctx
    );

    return {
      tokens,
      auctions,
      balance,
      claims,
      land,
    };
  },

  async loader({ memory, options: { address, ...ctx } }) {
    const { auctions, balance, claims, land } = await fetchState(address, ctx);
    console.log({ balance, auctions, land, claims });
    Object.assign(memory, { auctions, balance, claims, land });
  },
});

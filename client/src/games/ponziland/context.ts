import { context, input } from "@daydreamsai/core";
import { z } from "zod";
import * as client from "./client";
import { getAllTokensFromAPI } from "./client/ponziland_api";
import { subscriptionClient, subscribeToEntityUpdates } from "./client";

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
  inputs: {
    "subscribe.entity_updated": input({
      schema: z.object({
        id: z.string(),
        keys: z.array(z.string()),
        eventId: z.string(),
        models: z.array(z.any()),
      }),

      subscribe(send, agent) {
        let subscriptionId: string;

        const startSubscription = async () => {
          try {
            subscriptionId = await subscribeToEntityUpdates((event) => {
              console.log("event", event);
              send(
                ponzilandContext,
                { id: "ponziland-1" },
                {
                  id: event.id,
                  keys: event.keys,
                  eventId: event.eventId,
                  models: event.models,
                }
              );
            });
          } catch (error) {
            console.error("Failed to start subscription:", error);
          }
        };

        startSubscription();

        return () => {
          if (subscriptionId) {
            subscriptionClient.unsubscribe(subscriptionId);
          }
        };
      },
    }),
  },
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

import { context, input, render } from "@daydreamsai/core";
import { z } from "zod";
import * as client from "./client";
import { getAllTokensFromAPI } from "./client/ponziland_api";
import { subscriptionClient, subscribeToEntityUpdates } from "./client";

import docs from "./templates";

export async function fetchState(address: string, ctx: client.ClientsContext) {
  const tokens = await getAllTokensFromAPI();

  const [balance, auctions, land, claims, all_owned_lands] = await Promise.all([
    client.get_balances(address, tokens, ctx),
    client.get_auctions(ctx),
    client.get_lands(address, tokens, ctx),
    client.get_claims(address, ctx),
    client.get_all_owned_lands(),
  ]);

  return {
    tokens,
    balance,
    auctions,
    land,
    claims,
    all_owned_lands,
  };
}

export const ponzilandContext = context({
  type: "ponziland",
  schema: {
    id: z.string(),
  },
  key: ({ id }) => id,
  instructions: docs.docs,
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
    const { tokens, auctions, balance, claims, land, all_owned_lands } =
      await fetchState(address, ctx);

    return {
      tokens,
      auctions,
      balance,
      claims,
      land,
      all_owned_lands,
    };
  },

  async loader({ memory, options: { address, ...ctx } }) {
    const { auctions, balance, claims, land, all_owned_lands } =
      await fetchState(address, ctx);
    Object.assign(memory, { auctions, balance, claims, land, all_owned_lands });
  },
});

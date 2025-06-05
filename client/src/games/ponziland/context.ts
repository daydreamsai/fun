import {
  context,
  input,
  formatValue,
  XMLElement,
  formatXml,
} from "@daydreamsai/core";
import { z } from "zod";
import * as client from "./client";
import { getAllTokensFromAPI } from "./client/ponziland_api";
import { subscriptionClient, subscribeToEntityUpdates } from "./client";
import { jsonPath } from "@/lib/jsonPath";

import { templates as defaultTemplates } from "./templates";
import { useTemplateStore } from "@/store/templateStore";

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

  render({ memory }) {
    const { selected, templates } = useTemplateStore.getState();

    // Get the current template from the Zustand store
    const rulesTemplate = selected.ponziland?.rules
      ? templates.ponziland.find((t) => t.id === selected.ponziland?.rules)
          ?.prompt
      : defaultTemplates.rules;

    const instructionsTemplate = selected.ponziland?.instructions
      ? templates.ponziland.find(
          (t) => t.id === selected.ponziland?.instructions
        )?.prompt
      : defaultTemplates.context;

    const templateVariables = {
      ...memory,
      guide: defaultTemplates.docs,
      goal: "Maximize profit and expand your land empire in Ponziland",
      lands: memory.land?.lands || [],
      balance: memory.balance || [],
      memory: "",
      tokens: memory.tokens || [],
      auctions: memory.auctions || [],
      claims: memory.claims || [],
      all_owned_lands: memory.all_owned_lands || [],
    };

    const rules = rulesTemplate
      ? renderTemplate(defaultTemplates.rules, templateVariables)
      : "";

    const instructions = instructionsTemplate
      ? renderTemplate(defaultTemplates.instructions, templateVariables)
      : "";

    // Use the template from the store
    const prompt = renderTemplate(defaultTemplates.context, {
      ...templateVariables,
      rules,
      instructions,
    });

    return prompt;
  },
});

// Template rendering function similar to Gigaverse
export function renderTemplate<Template extends string>(
  str: Template,
  data: any
) {
  return str
    .trim()
    .replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_match, key: string) => {
      const res = jsonPath(data, key);
      if (!res) return "";
      const [value] = res;
      if (typeof value === "object") {
        if (value && "tag" in value) return formatXml(value as XMLElement);
        if (value) return formatValue(value);
      }

      if (Array.isArray(value)) {
        return value
          .map((v) => {
            if (typeof v === "object" && v && "tag" in v) {
              return formatXml(v);
            }
            return formatValue(v);
          })
          .join("\n");
      }

      return value ?? "";
    });
}

import { action } from "@daydreamsai/core";
import { get_balances as get_balances_query } from "../client/querys";

export const get_balances_ = action({
  name: "ponziland.get-balances",
  description:
    "Get all of your starknet token balances. This should always be called before attempting to spend tokens",
  schema: {},
  async handler(data, ctx, agent) {
    let balances = await get_balances_query(ctx.options.address, ctx.options);
    return balances;
  },
});

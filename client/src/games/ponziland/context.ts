import { context } from "@daydreamsai/core";
import { StarknetChain } from "@daydreamsai/defai";
import * as client from "./client/querys";
import { z } from "zod";
import { useSettingsStore } from "@/store/settingsStore";
import { manifest, ponziland_address, view_manifest } from "./constants";
import { Abi, Contract, RpcProvider } from "starknet";

export async function fetchState(address: string, ctx: client.ClientsContext) {
  const balance = await client.get_balances(address, ctx);
  const auction = await client.get_auctions(ctx);
  const land = await client.get_lands(address, ctx);
  const claims = await client.get_claims(address, ctx);
  return { balance, auction, land, claims };
}

export function createClientsContext() {
  const { cartridgeAccount } = useSettingsStore.getState();

  if (!cartridgeAccount?.address) throw new Error("no cartridgeAccount");

  const provider = new RpcProvider({
    nodeUrl: import.meta.env.VITE_PUBLIC_NODE_URL!,
  });

  const ponziLandContract = new Contract(
    manifest.contracts[0].abi,
    ponziland_address,
    provider
  ).typedv2(manifest.contracts[0].abi as Abi);

  let starknetChain: StarknetChain;

  const viewContract = new Contract(
    view_manifest.contracts[0].abi,
    view_manifest.contracts[0].address,
    provider
  ).typedv2(view_manifest.contracts[0].abi as Abi);
  return {
    provider,
    account: cartridgeAccount,
    address: cartridgeAccount.address!,
    chain: starknetChain!,
    ponziLandContract,
    viewContract,
  };
}

export const ponzilandContext = context({
  type: "ponziland",
  schema: {
    id: z.string(),
  },
  key: ({ id }) => id,
  instructions: "Build your bitcoin empire in ponziland",
  setup: () => createClientsContext(),
  async create({ options: { account, address, ...ctx } }) {
    const { auction, balance, claims, land } = await fetchState(address, ctx);
    return {
      auction,
      balance,
      claims,
      land,
    };
  },

  async loader({ memory, options: { address, ...ctx } }) {
    const { auction, balance, claims, land } = await fetchState(address, ctx);
    console.log({ balance, auction, land, claims });
    Object.assign(memory, { auction, balance, claims, land });
  },
});

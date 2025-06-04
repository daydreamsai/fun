import { StarknetChain } from "@daydreamsai/defai";
import { useSettingsStore } from "@/store/settingsStore";
import { manifest, ponziland_address, view_manifest } from "../constants";
import { Contract, RpcProvider } from "starknet";
import { ponziland_abi } from "../configs/ponziland_abi";
import { view_abi } from "../configs/view_abi";
export * from "./querys";

export type ClientsContext = Pick<
  ReturnType<typeof createClientsContext>,
  "provider" | "ponziLandContract" | "viewContract"
>;

export function createClientsContext() {
  const { cartridgeAccount } = useSettingsStore.getState();

  const provider = new RpcProvider({
    nodeUrl: import.meta.env.VITE_PUBLIC_NODE_URL!,
  });

  const ponziLandContract = new Contract(
    manifest.contracts[0].abi,
    ponziland_address,
    provider
  ).typedv2(ponziland_abi);

  let starknetChain: StarknetChain;

  const viewContract = new Contract(
    view_manifest.contracts[0].abi,
    view_manifest.contracts[0].address,
    provider
  ).typedv2(view_abi);

  return {
    provider,
    account: cartridgeAccount,
    address: cartridgeAccount?.address,
    chain: starknetChain!,
    ponziLandContract,
    viewContract,
  };
}

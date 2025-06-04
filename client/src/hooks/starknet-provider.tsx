import React, { useCallback } from "react";
import { ControllerConnector } from "@cartridge/connector";
import { sepolia, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  voyager,
  jsonRpcProvider,
  Connector,
} from "@starknet-react/core";
import { constants } from "starknet";
import { toSessionPolicies } from "@cartridge/controller";
import policies from "../games/ponziland/configs/policies.json";

const nonLocalController = new ControllerConnector({
  chains: [
    {
      rpcUrl: import.meta.env.VITE_PUBLIC_NODE_URL,
    },
  ],
  defaultChainId:
    import.meta.env.VITE_PUBLIC_CHAIN === "mainnet"
      ? constants.StarknetChainId.SN_MAIN
      : constants.StarknetChainId.SN_SEPOLIA,
  preset: "ponziland-tourney-2",
  policies: toSessionPolicies(policies.chains["SN_MAIN"].policies),
  slot: "ponziland-tourney-2",
  namespace: "ponziland",
});

const provider = jsonRpcProvider({
  rpc: () => {
    return { nodeUrl: import.meta.env.VITE_PUBLIC_NODE_URL };
  },
});

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  return (
    <StarknetConfig
      chains={[mainnet]}
      provider={provider}
      connectors={[nonLocalController as unknown as Connector]}
      explorer={voyager}
    >
      {children}
    </StarknetConfig>
  );
}

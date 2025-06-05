import React, { useCallback, useEffect } from "react";
import { ControllerConnector } from "@cartridge/connector";
import { sepolia, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  voyager,
  jsonRpcProvider,
  Connector,
  useConnect,
  useAccount,
} from "@starknet-react/core";
import { Account, AccountInterface, constants } from "starknet";
import { toSessionPolicies } from "@cartridge/controller";
import { useSettingsStore } from "@/store/settingsStore";
import policies from "../games/ponziland/configs/policies.json";
import { useMutation } from "@tanstack/react-query";

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
  preset: "ponziland",
  policies: toSessionPolicies(policies.chains["SN_MAIN"].policies),
  slot: "ponziland",
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
      autoConnect={true}
    >
      {children}
    </StarknetConfig>
  );
}

export function useStarknetLogin() {
  const settings = useSettingsStore();
  const { connect, connectors } = useConnect();
  const { account } = useAccount();

  // Check if account is already connected on mount and update store
  useEffect(() => {
    if (account && !settings.cartridgeAccount) {
      settings.setCartridgeAccount(account as Account | AccountInterface);
    }
  }, [account, settings]);

  return useMutation({
    mutationKey: ["starknet:auth"],
    mutationFn: async () => {
      try {
        connect({ connector: connectors[0] });
      } catch (error) {
        console.error(error);
      }

      return account;
    },
    onSuccess(account) {
      settings.setCartridgeAccount(account as Account | AccountInterface);
    },
  });
}

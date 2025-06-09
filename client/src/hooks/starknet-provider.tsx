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
  preset: "daydreams",
  policies: toSessionPolicies(policies.chains["SN_MAIN"].policies),
  slot: "ponziland",
  namespace: "daydreams",
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

// Custom hook to manage account state properly
export function useCartridgeAccount() {
  const { account } = useAccount();
  const { cartridgeAccount, setCartridgeAccount } = useSettingsStore();

  // Sync account to store when available (only one place to manage this)
  useEffect(() => {
    if (
      account &&
      (!cartridgeAccount || cartridgeAccount.address !== account.address)
    ) {
      setCartridgeAccount(account as Account | AccountInterface);
    } else if (!account && cartridgeAccount) {
      // Clear store account if starknet account is disconnected
      setCartridgeAccount(null);
    }
  }, [account, cartridgeAccount, setCartridgeAccount]);

  return {
    account: cartridgeAccount,
    isConnected: !!cartridgeAccount,
    isLoading: !account && !cartridgeAccount, // Still loading if no account from either source
  };
}

export function useStarknetLogin() {
  const { setCartridgeAccount } = useSettingsStore();
  const { connect, connectors } = useConnect();

  return useMutation({
    mutationKey: ["starknet:auth"],
    mutationFn: async () => {
      try {
        connect({ connector: connectors[0] });
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    onSuccess(_, variables) {
      // Account will be set via useCartridgeAccount hook when useAccount updates
      console.log("Starknet connection initiated");
    },
  });
}

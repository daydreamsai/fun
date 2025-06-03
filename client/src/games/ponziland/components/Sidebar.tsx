import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { useAccount, useConnect } from "@starknet-react/core";
import { useMutation } from "@tanstack/react-query";
import { Account, AccountInterface } from "starknet";

function useStarknetLogin() {
  const settings = useSettingsStore();
  const { connect, connectors } = useConnect();
  const { account } = useAccount();
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

export function PonziLandSidebar({ args }: { args: { id: string } }) {
  const { account } = useAccount();

  const { cartridgeAccount } = useSettingsStore((state) => state);
  const { mutate: login } = useStarknetLogin();

  console.log(cartridgeAccount);

  return (
    <div>
      <div>PonziLandSidebar {args.id}</div>
      <div>
        <Button onClick={() => login()}>Connect</Button>
        {account?.address}
      </div>
    </div>
  );
}

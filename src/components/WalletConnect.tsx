import { FC } from "react";
import { useWalletContext } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, CreditCard } from "lucide-react";
import { TOKEN_GATE_CONFIG } from "@/utils/tokenGate";

export const WalletConnect: FC = () => {
  const { publicKey, connected, disconnect } = useWalletContext();

  // Format wallet address for display
  const formatWalletAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!connected || !publicKey) {
    return (
      <WalletMultiButton className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md px-4 py-2" />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <span>{formatWalletAddress(publicKey.toString())}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2 cursor-default">
          <CreditCard className="h-4 w-4" />
          <span>Required: {TOKEN_GATE_CONFIG.REQUIRED_BALANCE} tokens</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
          onClick={() => disconnect()}
        >
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

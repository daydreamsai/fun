import { FC, useEffect, useState } from "react";
import { useWalletContext } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWalletMultiButton } from "@solana/wallet-adapter-base-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, CreditCard, User } from "lucide-react";
import { TOKEN_GATE_CONFIG } from "@/utils/tokenGate";
import { useUser } from "@/hooks/use-user";
import { useNavigate } from "@tanstack/react-router";
import { authenticateWithWallet } from "@/utils/wallet";
import { toast } from "sonner";

export const WalletConnect: FC = () => {
  const { setVisible: setModalVisible } = useWalletModal();
  const wallet = useWalletContext();
  const { publicKey, connected, disconnect } = wallet;
  const { isLoading, login, user } = useUser();
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { buttonState, onConnect } = useWalletMultiButton({
    onSelectWallet() {
      setModalVisible(true);
    },
  });

  // Format wallet address for display
  const formatWalletAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const needsAuth = connected && publicKey && !user;

  // Handle wallet connection with mandatory signature verification
  useEffect(() => {
    const handleWalletAuth = async () => {
      setIsAuthenticating(true);
      setAuthError(null);

      try {
        // Require signature-based authentication
        const authData = await authenticateWithWallet(wallet);

        if (authData) {
          // Login with signature
          await login(authData.address, authData.signature, authData.message);
          toast.success("Wallet verified successfully");
        } else {
          // Show error if signature fails
          const errorMsg = "Signature verification failed. Please try again.";
          setAuthError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Failed to authenticate with wallet";
        console.error("Authentication error:", error);
        setAuthError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsAuthenticating(false);
      }
    };

    if (!isAuthenticating && needsAuth && !authError) handleWalletAuth();
  }, [connected, login, needsAuth, authError]);

  if (!connected || !publicKey) {
    return (
      <Button
        size="sm"
        onClick={() => {
          switch (buttonState) {
            case "no-wallet":
              setModalVisible(true);
              break;
            case "has-wallet":
              if (onConnect) {
                onConnect();
              }
              break;
          }
        }}
      >
        Connect
      </Button>
    );
  }

  // If we have an auth error, show a retry button
  if (authError && !isAuthenticating) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-destructive">Authentication failed</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            setAuthError(null);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="mr-10 lg:mr-0">
        <Button variant="outline" className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <span>{formatWalletAddress(publicKey.toString())}</span>
          {(isLoading || isAuthenticating) && <span className="ml-1">•••</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate({ to: "/profile" as const })}
        >
          <User className="h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
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

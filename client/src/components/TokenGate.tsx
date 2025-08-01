import { FC, ReactNode, useEffect, useState } from "react";
import { useWalletContext } from "@/context/WalletContext";
import { checkAccess } from "@/utils/tokenGate";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useWalletModal,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { TOKEN_GATE_CONFIG } from "@/utils/tokenGate";
import {
  ExternalLink,
  RefreshCw,
  Wallet,
  Coins,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  CircleX,
  UserRoundCheck,
} from "lucide-react";
import { authenticateWithWallet } from "@/utils/wallet";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";
import { AsciiBackgroundEffect } from "@/components/AsciiBackgroundEffect";
import { useWalletMultiButton } from "@solana/wallet-adapter-base-ui";

interface TokenGateProps {
  children: ReactNode;
}

export const TokenGate: FC<TokenGateProps> = ({ children }) => {
  const wallet = useWalletContext();
  const { publicKey, connected, connecting } = wallet;
  const { isLoading: isUserLoading, user, login } = useUser();

  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<{
    hasAccess: boolean;
    message: string;
    tokenBalance?: number;
    isAuthenticated?: boolean;
  }>({
    hasAccess: false,
    message: "Checking access...",
    isAuthenticated: false,
  });

  const { setVisible: setModalVisible } = useWalletModal();
  const { buttonState, onConnect } = useWalletMultiButton({
    onSelectWallet() {
      setModalVisible(true);
    },
  });

  const RAYDIUM_SWAP_URL =
    "https://raydium.io/swap/?inputMint=sol&outputMint=GMzuntWYJLpNuCizrSR7ZXggiMdDzTNiEmSNHHunpump";

  // Handle wallet signature verification
  const verifyWalletOwnership = async () => {
    if (!connected || !publicKey) return false;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Require signature-based authentication
      const authData = await authenticateWithWallet(wallet);

      if (authData) {
        // Login with signature
        await login(authData.address, authData.signature, authData.message);
        toast.success("Wallet verified successfully");
        setAccessState((prev) => ({
          ...prev,
          isAuthenticated: true,
          message: prev.hasAccess
            ? "Access granted. Wallet verified."
            : prev.message,
        }));
        return true;
      } else {
        // Show error if signature fails
        const errorMsg = "Signature verification failed. Please try again.";
        setAuthError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to authenticate with wallet";
      console.error("Authentication error:", error);
      setAuthError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Check token balance and authentication status
  useEffect(() => {
    const verifyAccess = async () => {
      setIsChecking(true);

      if (!connected || !publicKey) {
        setAccessState({
          hasAccess: false,
          isAuthenticated: false,
          message: "Please connect your wallet to access this site.",
        });
        setIsChecking(false);
        return;
      }

      // First check if we're already authenticated
      const isAuthenticated = !!user && user.id === publicKey.toString();

      // Check token balance
      const result = await checkAccess(publicKey.toString());

      setAccessState({
        ...result,
        isAuthenticated,
        // Only grant access if both token balance is sufficient AND wallet is authenticated
        hasAccess: result.hasAccess && isAuthenticated,
        message: result.message,
      });

      setIsChecking(false);

      // If we're not authenticated yet but have sufficient tokens, trigger authentication
      if (result.hasAccess && !isAuthenticated && !authError) {
        verifyWalletOwnership();
      }
    };

    verifyAccess();
  }, [connected, publicKey, user]);

  if (import.meta.env.PROD !== true) {
    return children;
  }

  // Show loading state during any wallet interaction
  if (isChecking || connecting || isAuthenticating) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-end sm:items-center w-full justify-center p-4 sm:p-8 font-mono">
        <AsciiBackgroundEffect />
        <Card className="w-full max-w-sm border-2 border-primary/50 shadow-lg bg-background/80 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-center text-xl uppercase">
              {connecting
                ? "Connecting Wallet"
                : isAuthenticating
                  ? "Verifying Wallet"
                  : "Checking Access"}
            </CardTitle>
            <CardDescription className="text-center">
              {connecting
                ? "Please approve the connection request..."
                : isAuthenticating
                  ? "Please sign the message to verify ownership..."
                  : "Verifying your token balance..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8 pt-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!accessState.hasAccess) {
    const hasBalance =
      connected &&
      accessState.tokenBalance &&
      accessState.tokenBalance >= TOKEN_GATE_CONFIG.REQUIRED_BALANCE;
    return (
      <div className="flex min-h-s h-svh items-center w-full justify-center p-4 sm:p-8 font-mono">
        <AsciiBackgroundEffect />
        <Card className="w-full max-w-md border border-primary/20 shadow-2xl bg-background/80 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-6">
            <img
              src="/Daydreams.svg"
              alt="logo"
              className=" h-10 sm:h-12 mx-auto"
            />

            <p className="text-center text-sm text-muted-foreground mb-5">
              agentic automation for your web3 game
            </p>
          </CardHeader>
          <CardContent className="space-y-8 px-6">
            <div className="bg-muted/30 p-5 shadow-sm border border-primary/10 backdrop-blur-sm">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 backdrop-blur-sm">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm">Connect your Solana wallet</span>
                  {connected && (
                    <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />
                  )}
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 backdrop-blur-sm">
                    <span className="text-xs font-bold text-primary">
                      {TOKEN_GATE_CONFIG.REQUIRED_BALANCE / 1000}k
                    </span>
                  </div>
                  <span className="text-sm">
                    Hold at least {TOKEN_GATE_CONFIG.REQUIRED_BALANCE} $DREAMS
                    tokens in your wallet
                  </span>
                  {connected && (
                    <>
                      {hasBalance ? (
                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />
                      ) : (
                        <CircleX className="h-4 w-4 text-destructive ml-auto shrink-0 animate-pulse" />
                      )}
                    </>
                  )}
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 backdrop-blur-sm">
                    <UserRoundCheck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm">
                    Verify wallet ownership with a signature
                  </span>
                  {hasBalance ? (
                    <>
                      {accessState.isAuthenticated ? (
                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto animate-pulse" />
                      ) : (
                        <CircleX className="h-4 w-4 text-destructive ml-auto shrink-0 animate-pulse" />
                      )}
                    </>
                  ) : null}
                </li>
              </ul>
            </div>

            {connected &&
              accessState.tokenBalance !== undefined &&
              accessState.tokenBalance < TOKEN_GATE_CONFIG.REQUIRED_BALANCE && (
                <div className="rounded-xl border border-primary/20 bg-background/80 p-5 shadow-md backdrop-blur-sm">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                    <Coins className="h-5 w-5 text-primary" />
                    Your Token Balance
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">
                        Current balance
                      </span>
                      <span className="text-2xl font-bold text-foreground">
                        {accessState.tokenBalance}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-muted-foreground">
                        Required
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {TOKEN_GATE_CONFIG.REQUIRED_BALANCE}
                      </span>
                    </div>
                    <div className="mx-2 h-12 w-px bg-border/50"></div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-muted-foreground">
                        Needed
                      </span>
                      <span className="text-lg font-semibold text-destructive">
                        {Math.max(
                          0,
                          TOKEN_GATE_CONFIG.REQUIRED_BALANCE -
                            (accessState.tokenBalance || 0)
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="h-full bg-gradient-to-r from-primary/20 to-primary transition-all duration-500 ease-in-out rounded-r-full"
                      style={{
                        width: `${Math.min(100, (accessState.tokenBalance / TOKEN_GATE_CONFIG.REQUIRED_BALANCE) * 100)}%`,
                      }}
                    ></div>
                  </div>

                  {accessState.tokenBalance <
                    TOKEN_GATE_CONFIG.REQUIRED_BALANCE && (
                    <div className="mt-5">
                      <Button
                        className="w-full flex items-center justify-center py-5 rounded-lg shadow-md transition-all hover:shadow-lg"
                        onClick={() => window.open(RAYDIUM_SWAP_URL, "_blank")}
                      >
                        <ShoppingCart className="h-5 w-5" />
                        <span className="font-medium">
                          Buy Tokens on Raydium
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

            {/* Authentication section */}
            {connected &&
              !isUserLoading &&
              !accessState.isAuthenticated &&
              accessState.tokenBalance !== undefined &&
              accessState.tokenBalance >=
                TOKEN_GATE_CONFIG.REQUIRED_BALANCE && (
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 shadow-md backdrop-blur-sm">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                    <AlertCircle size={18} className="text-accent" />
                    Wallet Verification Required
                  </h3>
                  <p className="text-sm mb-4">
                    You need to verify you own this wallet by signing a message.
                  </p>
                  <Button
                    className="w-full"
                    onClick={verifyWalletOwnership}
                    disabled={isAuthenticating}
                  >
                    {isAuthenticating ? (
                      <>
                        Verifying{" "}
                        <span className="ml-2 animate-pulse">...</span>
                      </>
                    ) : (
                      <>Verify Wallet Ownership</>
                    )}
                  </Button>
                  {authError && (
                    <p className="mt-2 text-sm text-destructive">{authError}</p>
                  )}
                </div>
              )}

            <div className="flex flex-col items-center justify-center gap-5">
              {!connected ? (
                <>
                  <Button
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
                    Connect Wallet
                  </Button>
                  {/* <p className="text-center text-sm text-muted-foreground">
                    Connect your wallet to verify access
                  </p> */}
                </>
              ) : (
                <>
                  {/* <p className="text-center text-sm text-muted-foreground">
                    {accessState.message}
                  </p> */}
                  <Button
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 border-t border-primary/10 bg-muted/10 px-6 py-4 backdrop-blur-sm">
            <div className="flex gap-3 justify-center">
              <Button
                variant="link"
                className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors"
                onClick={() => window.open(RAYDIUM_SWAP_URL, "_blank")}
              >
                <span>Buy on Raydium</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return children;
};

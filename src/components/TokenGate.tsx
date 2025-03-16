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
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TOKEN_GATE_CONFIG } from "@/utils/tokenGate";
import {
  ExternalLink,
  Lock,
  RefreshCw,
  Wallet,
  Coins,
  ShoppingCart,
} from "lucide-react";

interface TokenGateProps {
  children: ReactNode;
}

export const TokenGate: FC<TokenGateProps> = ({ children }) => {
  const { publicKey, connected } = useWalletContext();
  const [isChecking, setIsChecking] = useState(true);
  const [accessState, setAccessState] = useState<{
    hasAccess: boolean;
    message: string;
    tokenBalance?: number;
  }>({
    hasAccess: false,
    message: "Checking access...",
  });

  const RAYDIUM_SWAP_URL =
    "https://raydium.io/swap/?inputMint=sol&outputMint=GMzuntWYJLpNuCizrSR7ZXggiMdDzTNiEmSNHHunpump";

  useEffect(() => {
    const verifyAccess = async () => {
      setIsChecking(true);

      if (!connected || !publicKey) {
        setAccessState({
          hasAccess: false,
          message: "Please connect your wallet to access this site.",
        });
        setIsChecking(false);
        return;
      }

      const result = await checkAccess(publicKey.toString());
      setAccessState(result);
      setIsChecking(false);
    };

    verifyAccess();
  }, [connected, publicKey]);

  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-background to-background/80 p-4">
        <Card className="w-[350px] border-2 border-primary/10 shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-center text-xl">
              Checking Access
            </CardTitle>
            <CardDescription className="text-center">
              Verifying your token balance...
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
    return (
      <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-gradient-to-b from-background to-background/80 p-4">
        <Card className="w-full max-w-md border-2 border-primary/10 shadow-xl">
          <CardHeader className="space-y-3 pb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl font-bold">
              Login Required
            </CardTitle>
            <CardDescription className="text-center text-base">
              This site is token-gated for $DREAMS holders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 px-6">
            <div className=" bg-muted/50 p-5 shadow-sm border border-primary/10">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm">Connect your Solana wallet</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    <span className="text-xs font-bold text-primary">
                      {TOKEN_GATE_CONFIG.REQUIRED_BALANCE}
                    </span>
                  </div>
                  <span className="text-sm">
                    Hold at least {TOKEN_GATE_CONFIG.REQUIRED_BALANCE} $DREAMS
                    tokens in your wallet
                  </span>
                </li>
              </ul>
            </div>

            {connected && accessState.tokenBalance !== undefined && (
              <div className="rounded-xl border border-primary/10 bg-background p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <Coins className="h-5 w-5 text-primary/70" />
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
                  <div className="mx-2 h-12 w-px bg-border"></div>
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
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, (accessState.tokenBalance / TOKEN_GATE_CONFIG.REQUIRED_BALANCE) * 100)}%`,
                    }}
                  ></div>
                </div>

                {accessState.tokenBalance <
                  TOKEN_GATE_CONFIG.REQUIRED_BALANCE && (
                  <div className="mt-5">
                    <Button
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-foreground/90 text-primary-foreground hover:opacity-90 py-5 rounded-lg shadow-md transition-all hover:shadow-lg"
                      onClick={() => window.open(RAYDIUM_SWAP_URL, "_blank")}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span className="font-medium">Buy Tokens on Raydium</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-center justify-center gap-5">
              {!connected ? (
                <>
                  <p className="text-center text-sm text-muted-foreground">
                    Connect your wallet to verify access
                  </p>
                  <WalletMultiButton className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg" />
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-muted-foreground">
                    {accessState.message}
                  </p>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 rounded-lg border-primary/20 px-5 py-2 text-sm font-medium shadow-sm transition-all hover:bg-primary/5 hover:shadow-md"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Balance
                  </Button>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 px-6 py-4">
            <div className="flex gap-3 justify-center">
              <Button
                variant="link"
                className="flex items-center gap-1.5 text-primary hover:text-primary/80"
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

  return <>{children}</>;
};

import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Configuration for token gating
export const TOKEN_GATE_CONFIG = {
  // Replace this with your actual token mint address
  // Example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" (USDC on mainnet)
  TOKEN_MINT_ADDRESS: "GMzuntWYJLpNuCizrSR7ZXggiMdDzTNiEmSNHHunpump",

  // Minimum token balance required to access the site
  REQUIRED_BALANCE: 2000,

  // Solana RPC endpoint (can be changed to devnet for testing)
  RPC_ENDPOINT:
    "https://mainnet.helius-rpc.com/?api-key=cb89293c-cd52-4b03-af7e-1f293a31ed88",
};

/**
 * Checks if a wallet has the required token balance
 * @param walletAddress The public key of the wallet to check
 * @returns Promise resolving to a boolean indicating if the wallet meets the token requirement
 */
export async function getTokenBalance(walletAddress: string): Promise<number> {
  try {
    if (!walletAddress) return 0;

    const connection = new Connection(TOKEN_GATE_CONFIG.RPC_ENDPOINT);
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenMintPublicKey = new PublicKey(
      TOKEN_GATE_CONFIG.TOKEN_MINT_ADDRESS
    );

    // Find all token accounts owned by the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    // Find the specific token account for our token
    const tokenAccount = tokenAccounts.value.find(
      (account) =>
        account.account.data.parsed.info.mint === tokenMintPublicKey.toString()
    );

    if (!tokenAccount) {
      console.log("No token account found for this wallet");
      return 0;
    }

    // Get the token balance
    const tokenBalance =
      Number(tokenAccount.account.data.parsed.info.tokenAmount.amount) /
      10 ** tokenAccount.account.data.parsed.info.tokenAmount.decimals;

    console.log(`Token balance: ${tokenBalance}`);

    // Check if the balance meets the requirement
    return tokenBalance;
  } catch (error) {
    console.error("Error checking token balance:", error);
    return 0;
  }
}

/**
 * Checks if the wallet is connected and has the required token balance
 * @param walletAddress The public key of the wallet to check
 * @returns Promise resolving to an object with access status and message
 */
export async function checkAccess(
  walletAddress: string | null
): Promise<{ hasAccess: boolean; message: string; tokenBalance?: number }> {
  if (!walletAddress) {
    return {
      hasAccess: false,
      message: "Please connect your wallet to access this site.",
    };
  }

  const tokenBalance = await getTokenBalance(walletAddress);

  if (tokenBalance < TOKEN_GATE_CONFIG.REQUIRED_BALANCE) {
    return {
      tokenBalance,
      hasAccess: false,
      message: `You need at least ${TOKEN_GATE_CONFIG.REQUIRED_BALANCE} tokens to access this site.`,
    };
  }

  return {
    tokenBalance,
    hasAccess: true,
    message: "Access granted.",
  };
}

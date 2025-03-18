import { WalletContextState } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

/**
 * Generate a challenge message for signing
 * @param address Wallet address for the challenge
 * @returns Challenge message with timestamp
 */
export const createAuthMessage = (
  address: string
): { message: string; timestamp: number } => {
  const timestamp = Date.now();
  const message = `I am signing this message to prove I own the wallet ${address}. Timestamp: ${timestamp}`;
  return { message, timestamp };
};

/**
 * Sign a message with the provided wallet
 * @param wallet The wallet adapter instance
 * @param message The message to sign
 * @returns Promise resolving to the signature or null if signing fails
 */
export const signMessage = async (
  wallet: WalletContextState,
  message: string
): Promise<string | null> => {
  try {
    if (!wallet.signMessage) {
      throw new Error("Wallet does not support message signing");
    }

    // Convert message to Uint8Array for signing
    const messageBytes = new TextEncoder().encode(message);

    // Sign the message
    const signature = await wallet.signMessage(messageBytes);

    // Convert signature to base58 (standard format for Solana signatures)
    return bs58.encode(signature);
  } catch (error) {
    console.error("Error signing message:", error);
    return null;
  }
};

/**
 * Full authentication flow with wallet signature
 * @param wallet The wallet adapter instance
 * @returns Authentication data or null if authentication fails
 */
export const authenticateWithWallet = async (
  wallet: WalletContextState
): Promise<{
  address: string;
  signature: string;
  message: string;
  timestamp: number;
} | null> => {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const address = wallet.publicKey.toString();
    const { message, timestamp } = createAuthMessage(address);
    const signature = await signMessage(wallet, message);

    if (!signature) {
      throw new Error("Failed to sign message");
    }

    return {
      address,
      signature,
      message,
      timestamp,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
};

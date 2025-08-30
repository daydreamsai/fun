import { privateKeyToAccount, type Account } from "viem/accounts";
import { createPublicClient, createWalletClient, http, formatUnits, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";
import { useSettingsStore } from "@/store/settingsStore";

// USDC contract addresses
const USDC_ADDRESSES = {
  "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
} as const;

// ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  }
] as const;

export class X402Service {
  private static instance: X402Service;
  private account: Account | null = null;
  private publicClient: any = null;
  private walletClient: any = null;

  private constructor() {}

  static getInstance(): X402Service {
    if (!X402Service.instance) {
      X402Service.instance = new X402Service();
    }
    return X402Service.instance;
  }

  /**
   * Initialize the service with wallet key from settings
   */
  async initialize() {
    const settings = useSettingsStore.getState();
    
    if (!settings.x402WalletKey) {
      throw new Error("No wallet key configured. Please set up your wallet in settings.");
    }

    try {
      // Create account from private key
      this.account = privateKeyToAccount(settings.x402WalletKey as `0x${string}`);
      
      // Set up chain
      const chain = settings.x402Network === "base" ? base : baseSepolia;
      
      // Create clients
      this.publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      this.walletClient = createWalletClient({
        account: this.account,
        chain,
        transport: http(),
      });

      return this.account.address;
    } catch (error) {
      console.error("Failed to initialize x402 service:", error);
      throw new Error("Invalid wallet key. Please check your configuration.");
    }
  }

  /**
   * Get the current account address
   */
  getAddress(): Address | null {
    return this.account?.address || null;
  }

  /**
   * Check USDC balance for the configured wallet
   */
  async getUSDCBalance(): Promise<{ balance: string; formatted: string }> {
    if (!this.account || !this.publicClient) {
      await this.initialize();
    }

    const settings = useSettingsStore.getState();
    const usdcAddress = USDC_ADDRESSES[settings.x402Network];

    try {
      // Get balance
      const balance = await this.publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [this.account!.address],
      });

      // Get decimals (should be 6 for USDC)
      const decimals = await this.publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "decimals",
      });

      const formatted = formatUnits(balance, decimals);
      
      return {
        balance: balance.toString(),
        formatted,
      };
    } catch (error) {
      console.error("Failed to check USDC balance:", error);
      throw new Error("Failed to check balance. Please ensure you're connected to the correct network.");
    }
  }

  /**
   * Validate if wallet has enough USDC for a request
   */
  async validateSufficientBalance(): Promise<boolean> {
    const settings = useSettingsStore.getState();
    const requiredAmount = BigInt(settings.x402Amount); // Amount in smallest unit
    
    try {
      const { balance } = await this.getUSDCBalance();
      return BigInt(balance) >= requiredAmount;
    } catch (error) {
      console.error("Failed to validate balance:", error);
      return false;
    }
  }

  /**
   * Estimate the cost in USD for a given number of requests
   */
  estimateCost(numRequests: number = 1): string {
    const settings = useSettingsStore.getState();
    const amountPerRequest = BigInt(settings.x402Amount);
    const totalAmount = amountPerRequest * BigInt(numRequests);
    
    // USDC has 6 decimals
    return formatUnits(totalAmount, 6);
  }

  /**
   * Get payment configuration for Dreams Router
   */
  getPaymentConfig() {
    const settings = useSettingsStore.getState();
    
    if (!this.account) {
      throw new Error("x402 service not initialized");
    }

    return {
      account: this.account,
      payments: {
        amount: settings.x402Amount,
        network: settings.x402Network,
      },
    };
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    const settings = useSettingsStore.getState();
    return !!settings.x402WalletKey && !!settings.x402Amount;
  }

  /**
   * Reset the service (useful when settings change)
   */
  reset() {
    this.account = null;
    this.publicClient = null;
    this.walletClient = null;
  }
}

// Export singleton instance
export const x402Service = X402Service.getInstance();
import { createWalletAuthManager, type WalletAuthManager } from '@daydreamsai/ai-sdk-provider';
import type { Address } from 'viem';

interface WalletJWTServiceConfig {
  baseURL?: string;
}

class WalletJWTService {
  private static instance: WalletJWTService;
  private authManager: WalletAuthManager | null = null;
  private currentJWT: string | null = null;
  private currentUser: any = null;
  private currentAddress: Address | null = null;
  
  private readonly JWT_STORAGE_KEY = 'dreams_router_jwt';
  private readonly USER_STORAGE_KEY = 'dreams_router_user';
  private readonly ADDRESS_STORAGE_KEY = 'dreams_router_address';

  private constructor(private config?: WalletJWTServiceConfig) {
    // Load stored JWT on initialization
    this.loadStoredAuth();
  }

  static getInstance(config?: WalletJWTServiceConfig): WalletJWTService {
    if (!WalletJWTService.instance) {
      WalletJWTService.instance = new WalletJWTService(config);
    }
    return WalletJWTService.instance;
  }

  /**
   * Load stored authentication from localStorage
   */
  private loadStoredAuth() {
    try {
      const storedJWT = localStorage.getItem(this.JWT_STORAGE_KEY);
      const storedUser = localStorage.getItem(this.USER_STORAGE_KEY);
      const storedAddress = localStorage.getItem(this.ADDRESS_STORAGE_KEY);
      
      if (storedJWT && storedUser) {
        this.currentJWT = storedJWT;
        this.currentUser = JSON.parse(storedUser);
        this.currentAddress = storedAddress as Address | null;
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      this.clearStoredAuth();
    }
  }

  /**
   * Store authentication in localStorage
   */
  private storeAuth(jwt: string, user: any, address: Address) {
    try {
      localStorage.setItem(this.JWT_STORAGE_KEY, jwt);
      localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(this.ADDRESS_STORAGE_KEY, address);
      
      this.currentJWT = jwt;
      this.currentUser = user;
      this.currentAddress = address;
    } catch (error) {
      console.error('Failed to store auth:', error);
    }
  }

  /**
   * Clear stored authentication
   */
  private clearStoredAuth() {
    localStorage.removeItem(this.JWT_STORAGE_KEY);
    localStorage.removeItem(this.USER_STORAGE_KEY);
    localStorage.removeItem(this.ADDRESS_STORAGE_KEY);
    
    this.currentJWT = null;
    this.currentUser = null;
    this.currentAddress = null;
    
    if (this.authManager) {
      this.authManager.logout();
    }
  }

  /**
   * Create authentication message for wallet signing
   */
  private createAuthMessage(address: Address): string {
    const timestamp = Date.now();
    const domain = window.location.hostname;
    
    return `Sign this message to authenticate with Dreams Router:\n\nAddress: ${address}\nDomain: ${domain}\nTimestamp: ${timestamp}\nNonce: ${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get JWT using wallet signature
   */
  async getJWTFromWallet(
    address: Address, 
    signMessage: (message: string) => Promise<string | null>
  ): Promise<string | null> {
    try {
      // Check if we already have a valid JWT for this address
      if (this.currentJWT && this.currentAddress === address) {
        return this.currentJWT;
      }

      // Create a pseudo-account object with the signMessage function
      const account = {
        address,
        signMessage: async ({ message }: { message: string }) => {
          const signature = await signMessage(message);
          if (!signature) throw new Error('Failed to sign message');
          return signature as `0x${string}`;
        },
      } as any; // We cast to any because we're creating a partial Account

      // Create auth manager if not exists
      if (!this.authManager) {
        this.authManager = createWalletAuthManager({
          baseURL: this.config?.baseURL || 'https://router.daydreams.systems',
        });
      }

      // Authenticate with Dreams Router
      const { sessionToken, user } = await this.authManager.walletLogin(account);

      if (sessionToken && user) {
        // Store the JWT and user info
        this.storeAuth(sessionToken, user, address);
        
        // Store the current auth manager state
        this.authManager.currentSessionToken = sessionToken;
        this.authManager.currentUser = user;
        
        return sessionToken;
      } else {
        throw new Error('Failed to authenticate with Dreams Router');
      }
    } catch (error) {
      console.error('Failed to get JWT from wallet:', error);
      this.clearStoredAuth();
      throw error;
    }
  }


  /**
   * Get current JWT
   */
  getJWT(): string | null {
    return this.currentJWT;
  }

  /**
   * Get current user
   */
  getUser(): any {
    return this.currentUser;
  }

  /**
   * Get current address
   */
  getAddress(): Address | null {
    return this.currentAddress;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentJWT && !!this.currentUser;
  }

  /**
   * Clear JWT and logout
   */
  clearJWT() {
    this.clearStoredAuth();
  }

  /**
   * Get the auth manager for direct use
   */
  getAuthManager(): WalletAuthManager | null {
    return this.authManager;
  }

  /**
   * Get payment configuration for Dreams Router
   */
  getPaymentConfig() {
    if (!this.currentJWT) {
      throw new Error('No JWT available. Please authenticate first.');
    }

    return {
      apiKey: this.currentJWT,
      authMethod: 'session-token' as const,
    };
  }
}

// Export singleton instance
export const walletJWTService = WalletJWTService.getInstance();
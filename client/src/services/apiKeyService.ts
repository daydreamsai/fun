interface ApiKeyServiceConfig {
  baseURL?: string;
}

class ApiKeyService {
  private static instance: ApiKeyService;
  private currentApiKey: string | null = null;
  
  private readonly API_KEY_STORAGE_KEY = 'dreams_router_api_key';

  private constructor(private config?: ApiKeyServiceConfig) {
    // Load stored API key on initialization
    this.loadStoredApiKey();
  }

  static getInstance(config?: ApiKeyServiceConfig): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService(config);
    }
    return ApiKeyService.instance;
  }

  /**
   * Load stored API key from localStorage
   */
  private loadStoredApiKey() {
    try {
      const storedApiKey = localStorage.getItem(this.API_KEY_STORAGE_KEY);
      
      if (storedApiKey) {
        this.currentApiKey = storedApiKey;
      }
    } catch (error) {
      console.error('Failed to load stored API key:', error);
      this.clearStoredApiKey();
    }
  }

  /**
   * Store API key in localStorage
   */
  private storeApiKey(apiKey: string) {
    try {
      localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
      this.currentApiKey = apiKey;
    } catch (error) {
      console.error('Failed to store API key:', error);
    }
  }

  /**
   * Clear stored API key
   */
  private clearStoredApiKey() {
    localStorage.removeItem(this.API_KEY_STORAGE_KEY);
    this.currentApiKey = null;
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }
    
    this.storeApiKey(apiKey.trim());
  }

  /**
   * Get current API key
   */
  getApiKey(): string | null {
    return this.currentApiKey;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.currentApiKey;
  }

  /**
   * Validate API key format (basic validation)
   */
  validateApiKey(apiKey: string): boolean {
    // Basic validation - ensure it's not empty and has reasonable length
    const trimmed = apiKey.trim();
    return trimmed.length > 0 && trimmed.length >= 10; // Minimum 10 characters
  }

  /**
   * Clear API key
   */
  clearApiKey(): void {
    this.clearStoredApiKey();
  }

  /**
   * Get configuration for Dreams Router
   */
  getDreamsRouterConfig() {
    if (!this.currentApiKey) {
      throw new Error('No API key configured. Please set up your Dreams Router API key in settings.');
    }

    return {
      apiKey: this.currentApiKey,
      baseURL: this.config?.baseURL || 'https://router.daydreams.systems',
    };
  }
}

// Export singleton instance
export const apiKeyService = ApiKeyService.getInstance();
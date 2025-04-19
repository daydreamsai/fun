export interface CreateCheckoutSessionRequest {
  creditAmount: number;
  userId: string;
  userEmail: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
}

export interface StripeWebhookResponse {
  received: boolean;
}

export interface PaymentSuccessQueryParams {
  session_id: string;
}

export interface PaymentSuccessResponse {
  success: boolean;
  displayCredits: number;
  openRouterDollars: number;
  userId: string;
}

export interface UserIdParams {
  userId: string;
}

export interface WalletAddressParams {
  walletAddress: string;
}

// Basic structure, refine if more details are known
export interface OpenRouterKeyData {
  data: {
    hash: string;
    limit?: number | null;
    usage?: number | null;
    // Add other relevant fields from OpenRouter API response
  };
  key?: string; // Only present on creation
}

export interface GetOpenRouterKeyResponse {
  keyData: OpenRouterKeyData;
  displayCredits: number;
  openRouterDollars: number;
}

export interface ProvisionOpenRouterKeyRequest {
  userId: string;
}

export interface ProvisionOpenRouterKeyResponse {
  keyData: OpenRouterKeyData; // Includes the full key
  displayCredits: number;
  openRouterDollars: number;
}

export interface UpdateOpenRouterKeyRequest {
  disabled?: boolean;
  newDisplayLimit?: number;
}

export interface UpdateOpenRouterKeyResponse {
  keyData: OpenRouterKeyData; // Updated key data
  displayCredits?: number; // Only if limit was updated
  openRouterDollars?: number; // Only if limit was updated
}

export interface DeleteOpenRouterKeyResponse {
  success: boolean;
}

export interface SyncCreditsResponse {
  keyData: OpenRouterKeyData;
  displayCredits: number;
  openRouterDollars: number;
}

export interface GetOpenRouterCreditsResponse {
  openRouter: {
    totalDollars: number;
    usedDollars: number;
    remainingDollars: number;
  };
  display: {
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
    usagePercentage: number;
  };
}

export interface VerifyLoginRequest {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp?: number;
}

// Base User interface based on Supabase usage in index.ts
export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  last_login: string;
  credits: number;
  openrouter_key_hash?: string | null;
  openrouter_key?: string | null; // Note: Storing raw keys is risky
  // Add other fields from your 'users' table if necessary
}

export interface VerifyLoginResponse {
  user: User;
  token: string;
}

export interface GetUserResponse {
  user: User;
}

export type UpdateUserRequest = Partial<
  Omit<User, "id" | "created_at" | "updated_at">
>; // Allow updating specific fields

export interface UpdateUserResponse {
  user: User;
}

export interface AddCreditsRequest {
  amount: number;
}

export interface AddCreditsResponse {
  user: User;
  message: string;
}

export interface UseCreditsRequest {
  amount: number;
}

export interface UseCreditsResponse {
  user: User;
  success: boolean;
  message: string;
}

// Generic error response
export interface ErrorResponse {
  error: string;
}

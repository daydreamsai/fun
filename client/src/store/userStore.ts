import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Database } from "../lib/database.types";
import {
  apiGet,
  apiPost,
  apiPatch,
  setAuthToken,
  apiDelete,
} from "@/utils/api";

export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

// Define OpenRouter key data type
export interface OpenRouterKeyData {
  hash: string;
  key: string;
  name: string;
  label: string;
  limit: number;
  used: number;
  disabled: boolean;
  created_at: string;
}

interface UserState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  apiKeyData: OpenRouterKeyData | null;

  // Actions
  login: (
    walletAddress: string,
    signature: string,
    message: string
  ) => Promise<void>;
  logout: () => void;
  updateUser: (updates: UserUpdate) => Promise<void>;
  fetchUser: (walletAddress: string) => Promise<User | null>;
  addCredits: (amount: number) => Promise<void>;
  useCredits: (amount: number) => Promise<boolean>;

  // API Key Management
  getApiKey: () => Promise<OpenRouterKeyData | null>;
  provisionApiKey: () => Promise<OpenRouterKeyData | null>;
  updateApiKey: (options: {
    disabled?: boolean;
    newLimit?: number;
  }) => Promise<OpenRouterKeyData | null>;
  deleteApiKey: () => Promise<boolean>;
  syncCreditsWithApiKey: () => Promise<OpenRouterKeyData | null>;
}

const apiUrl = import.meta.env.VITE_FUN_API_URL;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isLoading: false,
      error: null,
      apiKeyData: null,

      login: async (
        walletAddress: string,
        signature: string,
        message: string
      ) => {
        set({ isLoading: true, error: null });

        if (!walletAddress || !signature || !message) {
          set({
            error: "Wallet address, signature, and message are required",
            isLoading: false,
          });
          return;
        }

        try {
          const response = await apiPost(`/api/user/login/verify`, {
            walletAddress,
            signature,
            message,
            timestamp: Date.now(),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Signature verification failed");
          }

          const { user, token } = await response.json();

          // Store the JWT token
          if (token) {
            setAuthToken(token);
          }

          set({ currentUser: user, isLoading: false });
          console.log("User logged in with signature:", user);
        } catch (error) {
          console.error("Login error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error during login",
            isLoading: false,
          });
        }
      },

      logout: () => {
        set({ currentUser: null });
      },

      updateUser: async (updates: UserUpdate) => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ error: "No user logged in" });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await apiPatch(
            `/api/user/${currentUser.id}`,
            updates
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Update failed");
          }

          const { user } = await response.json();
          set({ currentUser: user, isLoading: false });
        } catch (error) {
          console.error("Update error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error during update",
            isLoading: false,
          });
        }
      },

      fetchUser: async (walletAddress: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiGet(`/api/user/${walletAddress}`);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Fetch failed");
          }

          const { user } = await response.json();
          return user;
        } catch (error) {
          console.error("Fetch user error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error fetching user",
            isLoading: false,
          });
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      addCredits: async (amount: number) => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ error: "No user logged in" });
          return;
        }

        if (amount <= 0) {
          set({ error: "Amount must be greater than 0" });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await apiPost(
            `/api/user/${currentUser.id}/add-credits`,
            { amount }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to add credits");
          }

          const { user, message } = await response.json();
          set({ currentUser: user, isLoading: false });
          console.log(message);
        } catch (error) {
          console.error("Add credits error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error adding credits",
            isLoading: false,
          });
        }
      },

      useCredits: async (amount: number) => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ error: "No user logged in" });
          return false;
        }

        if (amount <= 0) {
          set({ error: "Amount must be greater than 0" });
          return false;
        }

        if ((currentUser.credits || 0) < amount) {
          set({ error: "Insufficient credits" });
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await apiPost(
            `/api/user/${currentUser.id}/use-credits`,
            { amount }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to use credits");
          }

          const { user, success, message } = await response.json();
          set({ currentUser: user, isLoading: false });
          console.log(message);
          return success;
        } catch (error) {
          console.error("Use credits error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error using credits",
            isLoading: false,
          });
          return false;
        }
      },

      // API Key Management Functions - These already use API endpoints
      getApiKey: async () => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ error: "No user logged in" });
          return null;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await apiGet(
            `/api/openrouter/key/${currentUser.id}`
          );

          if (!response.ok) {
            if (response.status === 404) {
              // Key not found is not an error, just return null
              set({ apiKeyData: null, isLoading: false });
              return null;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get API key");
          }

          const { keyData } = await response.json();
          set({ apiKeyData: keyData, isLoading: false });
          return keyData;
        } catch (error) {
          console.error("Get API key error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error getting API key",
            isLoading: false,
          });
          return null;
        }
      },

      provisionApiKey: async () => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ error: "No user logged in" });
          return null;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await apiPost(`/api/openrouter/key`, {
            userId: currentUser.id,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to provision API key");
          }

          const { keyData } = await response.json();
          set({ apiKeyData: keyData, isLoading: false });

          // Update the user to reflect the new key hash
          const updatedUser = {
            ...currentUser,
            openrouter_key_hash: keyData.hash,
          };
          set({ currentUser: updatedUser });

          return keyData;
        } catch (error) {
          console.error("Provision API key error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error provisioning API key",
            isLoading: false,
          });
          return null;
        }
      },

      updateApiKey: async (options: {
        disabled?: boolean;
        newLimit?: number;
      }) => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ error: "No user logged in" });
          return null;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await apiPatch(
            `/api/openrouter/key/${currentUser.id}`,
            options
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update API key");
          }

          const { keyData } = await response.json();
          set({ apiKeyData: keyData, isLoading: false });
          return keyData;
        } catch (error) {
          console.error("Update API key error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error updating API key",
            isLoading: false,
          });
          return null;
        }
      },

      deleteApiKey: async () => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ error: "No user logged in" });
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await apiDelete(
            `/api/openrouter/key/${currentUser.id}`
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to delete API key");
          }

          // Update the user to reflect the removed key hash
          const updatedUser = {
            ...currentUser,
            openrouter_key_hash: null,
          };

          set({
            apiKeyData: null,
            currentUser: updatedUser,
            isLoading: false,
          });

          return true;
        } catch (error) {
          console.error("Delete API key error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error deleting API key",
            isLoading: false,
          });
          return false;
        }
      },

      syncCreditsWithApiKey: async () => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ error: "No user logged in" });
          return null;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await apiPost(
            `/api/openrouter/sync-credits/${currentUser.id}`,
            {}
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to sync credits with API key"
            );
          }

          const { keyData } = await response.json();
          set({ apiKeyData: keyData, isLoading: false });
          return keyData;
        } catch (error) {
          console.error("Sync credits error:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Unknown error syncing credits",
            isLoading: false,
          });
          return null;
        }
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

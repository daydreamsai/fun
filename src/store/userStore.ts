import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/database.types";

export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

interface UserState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (walletAddress: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: UserUpdate) => Promise<void>;
  fetchUser: (walletAddress: string) => Promise<User | null>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isLoading: false,
      error: null,

      login: async (walletAddress: string) => {
        set({ isLoading: true, error: null });
        try {
          // Check if user exists
          const { data: existingUser, error: fetchError } = await supabase
            .from("users")
            .select("*")
            .eq("id", walletAddress)
            .single();

          // If there's an error but it's not a "not found" error, throw it
          if (fetchError && fetchError.code !== "PGRST116") {
            throw fetchError;
          }

          if (existingUser) {
            // User exists, update last login time
            const { data: updatedUser, error: updateError } = await supabase
              .from("users")
              .update({
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", walletAddress)
              .select("*")
              .single();

            if (updateError) throw updateError;
            set({ currentUser: updatedUser, isLoading: false });
            console.log("User logged in:", updatedUser);
          } else {
            // User doesn't exist, create new user
            try {
              const newUser: UserInsert = {
                id: walletAddress,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
              };

              const { data: createdUser, error: insertError } = await supabase
                .from("users")
                .insert(newUser)
                .select("*")
                .single();

              if (insertError) {
                // If we get a duplicate key error, the user might have been created in another session
                // Try to fetch the user again
                if (insertError.code === "23505") {
                  const { data: _refetchedUser, error: refetchError } =
                    await supabase
                      .from("users")
                      .select("*")
                      .eq("id", walletAddress)
                      .single();

                  if (refetchError) throw refetchError;

                  // Update the last login time
                  const { data: reUpdatedUser, error: reUpdateError } =
                    await supabase
                      .from("users")
                      .update({
                        last_login: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", walletAddress)
                      .select("*")
                      .single();

                  if (reUpdateError) throw reUpdateError;
                  set({ currentUser: reUpdatedUser, isLoading: false });
                  console.log("User re-fetched and updated:", reUpdatedUser);
                  return;
                } else {
                  throw insertError;
                }
              }

              set({ currentUser: createdUser, isLoading: false });
              console.log("New user created:", createdUser);
            } catch (insertError) {
              console.error("Error creating user:", insertError);
              throw insertError;
            }
          }
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
          const { data: updatedUser, error } = await supabase
            .from("users")
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentUser.id)
            .select("*")
            .single();

          if (error) throw error;
          set({ currentUser: updatedUser, isLoading: false });
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
          const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", walletAddress)
            .single();

          if (error) throw error;
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
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

import { supabase } from "../lib/supabase";
import type { User, UserUpdate } from "../store/userStore";

/**
 * Fetch multiple users by their wallet addresses
 * @param walletAddresses Array of wallet addresses to fetch
 * @returns Array of users
 */
export async function fetchUsersByWalletAddresses(
  walletAddresses: string[]
): Promise<User[]> {
  if (!walletAddresses.length) return [];

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("id", walletAddresses);

  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }

  return data || [];
}

/**
 * Check if a user exists by wallet address
 * @param walletAddress Wallet address to check
 * @returns Boolean indicating if user exists
 */
export async function userExists(walletAddress: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", walletAddress)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking user existence:", error);
    throw error;
  }

  return !!data;
}

/**
 * Bulk update users
 * @param updates Array of user updates with wallet address and update data
 * @returns Array of updated users
 */
export async function bulkUpdateUsers(
  updates: Array<{ walletAddress: string; data: UserUpdate }>
): Promise<User[]> {
  if (!updates.length) return [];

  // Supabase doesn't support bulk updates directly, so we need to use transactions
  // For now, we'll do sequential updates
  const updatedUsers: User[] = [];

  for (const update of updates) {
    const { data, error } = await supabase
      .from("users")
      .update({
        ...update.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", update.walletAddress)
      .select("*")
      .single();

    if (error) {
      console.error(`Error updating user ${update.walletAddress}:`, error);
      continue;
    }

    if (data) {
      updatedUsers.push(data);
    }
  }

  return updatedUsers;
}

/**
 * Search for users by display name
 * @param query Search query
 * @param limit Maximum number of results to return
 * @returns Array of matching users
 */
export async function searchUsersByName(
  query: string,
  limit = 10
): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("display_name", `%${query}%`)
    .limit(limit);

  if (error) {
    console.error("Error searching users:", error);
    throw error;
  }

  return data || [];
}

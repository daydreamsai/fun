import { useEffect, useState } from "react";
import { useUserStore } from "../store/userStore";
import { useWallet } from "@solana/wallet-adapter-react";

export function useUser() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const {
    currentUser,
    isLoading,
    error,
    login,
    logout,
    updateUser,
    fetchUser,
  } = useUserStore();

  const [isInitialized, setIsInitialized] = useState(true);

  return {
    user: currentUser,
    isLoading,
    error,
    isInitialized,

    // Actions
    login,
    logout,
    updateUser,
    fetchUser,

    // Helpers
    isLoggedIn: !!currentUser,
    isConnectedUser:
      !!currentUser && !!walletAddress && currentUser.id === walletAddress,
  };
}

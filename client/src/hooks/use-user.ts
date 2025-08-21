import { useEffect, useState } from "react";
import { useUserStore } from "../store/userStore";

export function useUser() {
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
    // TODO: fix this
    isConnectedUser: true,
  };
}

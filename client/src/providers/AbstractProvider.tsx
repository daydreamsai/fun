import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  useAbstractClient, 
  useLoginWithAbstract,
  useGlobalWalletSignerAccount 
} from '@abstract-foundation/agw-react';
import type { Address } from 'viem';

interface AbstractWalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  address: Address | null;
  login: () => Promise<void>;
  logout: () => void;
  signMessage: (message: string) => Promise<string | null>;
  abstractClient: any;
}

const AbstractWalletContext = createContext<AbstractWalletContextType | null>(null);

export const useAbstractWallet = () => {
  const context = useContext(AbstractWalletContext);
  if (!context) {
    throw new Error('useAbstractWallet must be used within AbstractProvider');
  }
  return context;
};

interface AbstractProviderProps {
  children: ReactNode;
}

export const AbstractProvider: React.FC<AbstractProviderProps> = ({ children }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { login: abstractLogin, logout: abstractLogout } = useLoginWithAbstract();
  const { data: abstractClient } = useAbstractClient();
  const { data: signerAccount } = useGlobalWalletSignerAccount();
  
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (signerAccount?.address) {
      setIsConnected(true);
      setAddress(signerAccount.address as Address);
    } else {
      setIsConnected(false);
      setAddress(null);
    }
  }, [signerAccount]);

  const login = async () => {
    try {
      setIsConnecting(true);
      await abstractLogin();
    } catch (error) {
      console.error('Failed to connect with Abstract:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const logout = () => {
    abstractLogout();
    setIsConnected(false);
    setAddress(null);
  };

  const signMessage = async (message: string): Promise<string | null> => {
    if (!abstractClient || !signerAccount) {
      console.error('Abstract client not connected');
      return null;
    }

    try {
      // Sign message using Abstract Global Wallet
      const signature = await abstractClient.signMessage({
        account: signerAccount,
        message,
      });
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  };

  const contextValue: AbstractWalletContextType = {
    isConnected,
    isConnecting,
    address,
    login,
    logout,
    signMessage,
    abstractClient,
  };

  return (
    <AbstractWalletContext.Provider value={contextValue}>
      {children}
    </AbstractWalletContext.Provider>
  );
};
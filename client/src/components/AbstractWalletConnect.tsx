import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Wallet, LogOut, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAbstractWallet } from '@/providers/AbstractProvider';
import { toast } from 'sonner';
import { walletJWTService } from '@/services/walletJWTService';

export const AbstractWalletConnect: React.FC = () => {
  const { 
    isConnected, 
    isConnecting, 
    address, 
    login, 
    logout, 
    signMessage 
  } = useAbstractWallet();
  
  const [jwtStatus, setJwtStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [hasJWT, setHasJWT] = useState(false);

  // Format wallet address for display
  const formatWalletAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Authenticate and get JWT when wallet connects
  useEffect(() => {
    const authenticateWallet = async () => {
      if (isConnected && address && !hasJWT) {
        setJwtStatus('loading');
        try {
          // Get JWT using wallet signature
          const jwt = await walletJWTService.getJWTFromWallet(address, signMessage);
          
          if (jwt) {
            setHasJWT(true);
            setJwtStatus('success');
            toast.success('Successfully authenticated with Abstract wallet');
          } else {
            setJwtStatus('error');
            toast.error('Failed to authenticate wallet');
          }
        } catch (error) {
          setJwtStatus('error');
          console.error('Wallet authentication error:', error);
          toast.error('Failed to get authentication token');
        }
      }
    };

    authenticateWallet();
  }, [isConnected, address, signMessage, hasJWT]);

  // Handle logout
  const handleLogout = () => {
    walletJWTService.clearJWT();
    setHasJWT(false);
    setJwtStatus('idle');
    logout();
    toast.info('Wallet disconnected');
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Button
        onClick={login}
        disabled={isConnecting}
        variant="outline"
        className="flex items-center gap-2"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" />
            Connect Abstract
          </>
        )}
      </Button>
    );
  }

  // Connected state
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <span>{formatWalletAddress(address!)}</span>
          {jwtStatus === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
          {jwtStatus === 'success' && <CheckCircle className="h-3 w-3 text-green-500" />}
          {jwtStatus === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Abstract Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="flex items-center justify-between cursor-default">
          <span className="text-sm">Network</span>
          <Badge variant="secondary">Abstract</Badge>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="flex items-center justify-between cursor-default">
          <span className="text-sm">JWT Status</span>
          <Badge 
            variant={hasJWT ? "default" : "destructive"}
            className="text-xs"
          >
            {hasJWT ? 'Active' : 'Inactive'}
          </Badge>
        </DropdownMenuItem>
        
        {jwtStatus === 'error' && (
          <DropdownMenuItem 
            className="text-sm text-orange-500 cursor-pointer"
            onClick={async () => {
              setHasJWT(false);
              setJwtStatus('idle');
            }}
          >
            Retry Authentication
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
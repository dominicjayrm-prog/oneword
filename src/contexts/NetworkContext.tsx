import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isOnline: boolean;
  isReconnecting: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true, isReconnecting: false });

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected ?? false;

      if (online && wasOffline) {
        setIsReconnecting(true);
        setTimeout(() => setIsReconnecting(false), 2000);
      }

      setWasOffline(!online);
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, [wasOffline]);

  return (
    <NetworkContext.Provider value={{ isOnline, isReconnecting }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);

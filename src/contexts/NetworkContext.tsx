import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isOnline: boolean;
  isReconnecting: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true, isReconnecting: false });

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  // Use a ref to track previous offline state so the effect doesn't
  // re-subscribe on every state change (which caused an infinite loop).
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected ?? false;

      if (online && wasOfflineRef.current) {
        setIsReconnecting(true);
        setTimeout(() => setIsReconnecting(false), 2000);
      }

      wasOfflineRef.current = !online;
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, isReconnecting }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);

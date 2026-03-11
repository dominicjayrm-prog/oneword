import NetInfo from '@react-native-community/netinfo';

export type ApiError = 'offline' | 'server_error' | null;

export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T; error: any }>
): Promise<{ data: T | null; error: ApiError }> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { data: null, error: 'offline' };
  }

  try {
    const { data, error } = await queryFn();
    if (error) return { data: null, error: 'server_error' };
    return { data, error: null };
  } catch {
    return { data: null, error: 'offline' };
  }
}

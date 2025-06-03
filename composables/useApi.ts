import { useAuth } from './useAuth';

export function useApi() {
  const { accessToken, refreshToken, refreshAccessToken } = useAuth();

  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    // Add authorization header if we have a token
    const headers = {
      ...options.headers,
      ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });

      // If token expired, try to refresh and retry
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        
        // Only attempt refresh if it's a token expiration error
        if (errorData.error === 'token_expired' && refreshToken.value) {
          try {
            // Try to refresh the token
            const newToken = await refreshAccessToken();
            
            if (newToken) {
              // Retry the original request with new token
              const retryHeaders = {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              };
              
              const retryResponse = await fetch(url, {
                ...options,
                headers: retryHeaders,
              });
              
              return retryResponse;
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // If refresh fails, the original 401 response will be returned
          }
        }
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  return {
    fetchWithAuth,
  };
} 
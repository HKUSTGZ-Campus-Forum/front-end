import { useAuth } from './useAuth';

export function useApi() {
  const { accessToken, refreshToken, refreshAccessToken, logout } = useAuth();

  // Check if token is expired (decode JWT and check exp)
  function isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.error('❌ Failed to parse token:', error);
      return true; // If can't parse, consider expired
    }
  }

  // Smart fetch that handles authentication properly
  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    // If no access token at all, this is a login issue
    if (!accessToken.value) {
      console.error('❌ No access token available for authenticated request');
      throw new Error('Authentication required - please login first');
    }
    
    // If we have a token, check if it's expired
    if (isTokenExpired(accessToken.value)) {
      console.log('Token expired, attempting refresh...');
      
      if (refreshToken.value) {
        try {
          const newToken = await refreshAccessToken();
          if (!newToken) {
            console.warn('Token refresh failed, redirecting to login');
            logout();
            throw new Error('Authentication required - please login');
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          logout();
          throw new Error('Authentication required - please login');
        }
      } else {
        console.warn('No refresh token available');
        logout();
        throw new Error('Authentication required - please login');
      }
    }

    // Prepare headers
    const headers = {
      ...options.headers,
      ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });

      // Handle 401 responses
      if (response.status === 401) {
        console.log('Received 401, attempting token refresh...');
        
        if (refreshToken.value) {
          try {
            const newToken = await refreshAccessToken();
            
            if (newToken) {
              // Retry with new token
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
          }
        }
        
        // If we get here, auth failed completely
        console.warn('Authentication failed, clearing session');
        logout();
        throw new Error('Authentication failed - please login again');
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Public fetch for endpoints that don't require auth
  async function fetchPublic(url: string, options: RequestInit = {}) {
    // Explicitly don't send auth headers
    const { Authorization, ...headersWithoutAuth } = (options.headers as any) || {};
    
    return fetch(url, {
      ...options,
      headers: headersWithoutAuth,
    });
  }

  // Smart fetch that auto-detects if endpoint needs auth
  async function smartFetch(url: string, options: RequestInit = {}) {
    // List of endpoints that require authentication
    const authRequiredEndpoints = [
      '/api/files/',
      '/api/posts', // POST/PUT/DELETE require auth
      '/api/comments', // POST/PUT/DELETE require auth
      '/api/users/', // Some user endpoints require auth
      '/api/reactions',
    ];

    // Check if this endpoint requires auth
    const requiresAuth = authRequiredEndpoints.some(endpoint => url.includes(endpoint)) &&
                        (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE');

    if (requiresAuth || accessToken.value) {
      return fetchWithAuth(url, options);
    } else {
      return fetchPublic(url, options);
    }
  }

  return {
    fetchWithAuth,
    fetchPublic,
    smartFetch,
    isTokenExpired,
  };
} 
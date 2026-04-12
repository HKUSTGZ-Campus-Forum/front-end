import { useAuth } from './useAuth';

export function useApi() {
  const { accessToken, refreshToken, refreshAccessToken, logout } = useAuth();
  const config = useRuntimeConfig();

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

  // Helper function to get full API URL
  function getApiUrl(url: string): string {
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;

    // 相对路径：浏览器走同源 /api/...；SSR 拼上配置的绝对 base
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (import.meta.client) {
        return cleanUrl;
      }
      const baseUrl = String(config.public.apiBaseUrl || '').replace(/\/$/, '');
      return baseUrl ? `${baseUrl}${cleanUrl}` : cleanUrl;
    }

    // 绝对地址：在浏览器上若指向本机 Nuxt（localhost / 127.0.0.1 与当前页混用），改为相对路径以免 CORS
    if (import.meta.client && typeof window !== 'undefined') {
      try {
        const u = new URL(url);
        const loc = window.location;
        const isLoop = (h: string) => h === 'localhost' || h === '127.0.0.1';
        if (
          isLoop(u.hostname) &&
          isLoop(loc.hostname) &&
          u.port === loc.port &&
          u.pathname.startsWith('/api')
        ) {
          return `${u.pathname}${u.search}`;
        }
      } catch {
        /* ignore */
      }
    }

    return url;
  }

  // Smart fetch that handles authentication properly
  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    // If no access token at all, this is a login issue
    if (!accessToken.value) {
      console.error('❌ No access token available for authenticated request');
      throw new Error('Authentication required - please login first');
    }

    // Helper function to make the actual request
    const makeRequest = async (token: string) => {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };

      // Auto-stringify body if it's an object and content-type is JSON
      const processedOptions = { ...options, headers };
      if (options.body && typeof options.body === 'object' &&
          headers['Content-Type'] === 'application/json') {
        processedOptions.body = JSON.stringify(options.body);
      }

      return fetch(getApiUrl(url), processedOptions);
    };

    try {
      // First attempt with current token
      let response = await makeRequest(accessToken.value);

      // Handle 401 responses - token might be expired
      if (response.status === 401) {
        console.log('🔄 Received 401, attempting token refresh...');
        
        if (refreshToken.value) {
          try {
            const newToken = await refreshAccessToken();
            
            if (newToken) {
              console.log('✅ Token refreshed, retrying request...');
              response = await makeRequest(newToken);
            } else {
              console.warn('❌ Token refresh returned null');
              throw new Error('Token refresh failed');
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            throw new Error('Authentication failed - please login again');
          }
        } else {
          console.warn('❌ No refresh token available for retry');
          logout();
          throw new Error('Authentication required - please login');
        }
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
    
    return fetch(getApiUrl(url), {
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
    getApiUrl,
  };
} 
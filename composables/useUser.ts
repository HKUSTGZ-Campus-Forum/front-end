import { ref } from "vue";
import { useAuth } from "./useAuth";
import { useApi } from "./useApi";

// Cache for public user data
interface PublicUserData {
  username: string;
  profile_picture_url?: string;
  role_name?: string;
  cached_at?: number; // Timestamp when cached
}

// Cache expiration time (1 hour)
const CACHE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

const usersCache = ref<Record<string | number, PublicUserData>>({});

export function useUser() {
  const { fetchWithAuth, getApiUrl } = useApi();

  // Check if cached data is expired
  const isCacheExpired = (userData: PublicUserData): boolean => {
    if (!userData.cached_at) return true;
    return Date.now() - userData.cached_at > CACHE_EXPIRY_TIME;
  };

  // Check if OSS URL appears to be expired
  const isOSSUrlExpired = (url: string): boolean => {
    if (!url || !url.includes('aliyuncs.com')) return false;
    
    try {
      const urlObj = new URL(url);
      const expires = urlObj.searchParams.get('Expires') || urlObj.searchParams.get('x-oss-expires');
      if (expires) {
        const expirationTime = new Date(parseInt(expires) * 1000);
        const now = new Date();
        // Consider expired if within 10 minutes of expiration
        return expirationTime.getTime() - now.getTime() <= 10 * 60 * 1000;
      }
    } catch (error) {
      console.warn('Failed to parse OSS URL expiration:', error);
    }
    
    return false;
  };

  // Get public user information with smart caching
  const getUserById = async (userId: number, forceRefresh = false): Promise<PublicUserData> => {
    const cachedUser = usersCache.value[userId];
    
    // Check if we should use cached data
    if (!forceRefresh && cachedUser && !isCacheExpired(cachedUser)) {
      // If avatar URL looks expired, force refresh
      if (cachedUser.profile_picture_url && isOSSUrlExpired(cachedUser.profile_picture_url)) {
        console.log(`Avatar URL for user ${userId} appears expired, refreshing...`);
      } else {
        return cachedUser;
      }
    }

    try {
      // Use the public endpoint
      const response = await fetch(getApiUrl(`/users/public/${userId}`));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Failed to get user info");
      }

      // Create cache entry with public data and timestamp
      const userData: PublicUserData = {
        username: data.username,
        profile_picture_url: data.profile_picture_url,
        role_name: data.role_name,
        cached_at: Date.now()
      };

      // Store in cache
      usersCache.value[userId] = userData;

      return userData;
    } catch (error) {
      console.error("Error fetching user info:", error);
      
      // If we have cached data (even if expired), return it as fallback
      if (cachedUser) {
        console.log("Using cached data as fallback");
        return cachedUser;
      }
      
      // Return a default object for failed requests
      const defaultData: PublicUserData = {
        username: `用户-${userId}`,
        role_name: "user",
        cached_at: Date.now()
      };
      return defaultData;
    }
  };

  // Force refresh user data (useful when avatar URLs expire)
  const refreshUserById = async (userId: number): Promise<PublicUserData> => {
    return getUserById(userId, true);
  };

  // Get only username (with caching)
  async function getUsernameById(userId: string | number): Promise<string> {
    const userData = await getUserById(Number(userId));
    return userData.username;
  }

  // Clear cache for specific user
  function clearUserCache(userId: string | number) {
    if (usersCache.value[userId]) {
      delete usersCache.value[userId];
    }
  }

  // Clear all user cache
  function clearAllUserCache() {
    usersCache.value = {};
  }

  // Clear expired cache entries
  function clearExpiredCache() {
    const now = Date.now();
    Object.keys(usersCache.value).forEach(userId => {
      const userData = usersCache.value[userId];
      if (userData && isCacheExpired(userData)) {
        delete usersCache.value[userId];
      }
    });
  }

  // Get fresh avatar URL for a user (bypasses cache)
  const getFreshAvatarUrl = async (userId: number): Promise<string | null> => {
    try {
      const freshData = await refreshUserById(userId);
      return freshData.profile_picture_url || null;
    } catch (error) {
      console.error('Failed to get fresh avatar URL:', error);
      return null;
    }
  };

  return {
    getUserById,
    getUsernameById,
    refreshUserById,
    clearUserCache,
    clearAllUserCache,
    clearExpiredCache,
    getFreshAvatarUrl,
    usersCache,
  };
}

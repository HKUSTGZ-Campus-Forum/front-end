import { ref } from "vue";
import { useAuth } from "./useAuth";
import { useApi } from "./useApi";

// Cache for public user data
interface PublicUserData {
  username: string;
  profile_picture_url?: string;
  role_name?: string;
}

const usersCache = ref<Record<string | number, PublicUserData>>({});

export function useUser() {
  const { fetchWithAuth } = useApi();

  // Get public user information with caching
  const getUserById = async (userId: number): Promise<PublicUserData> => {
    // Check cache first
    if (usersCache.value[userId]) {
      return usersCache.value[userId];
    }

    try {
      // Use the public endpoint
      const response = await fetch(`https://dev.unikorn.axfff.com/api/users/public/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Failed to get user info");
      }

      // Create cache entry with public data
      const userData: PublicUserData = {
        username: data.username,
        profile_picture_url: data.profile_picture_url,
        role_name: data.role_name
      };

      // Store in cache
      usersCache.value[userId] = userData;

      return userData;
    } catch (error) {
      console.error("Error fetching user info:", error);
      // Return a default object for failed requests
      const defaultData: PublicUserData = {
        username: `用户-${userId}`,
        role_name: "user"
      };
      return defaultData;
    }
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

  return {
    getUserById,
    getUsernameById,
    clearUserCache,
    clearAllUserCache,
    usersCache,
  };
}

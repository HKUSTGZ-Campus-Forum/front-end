import { ref } from "vue";
import { useAuth } from "./useAuth";
import { useApi } from "./useApi";

// 用户缓存
const usersCache = ref<Record<string | number, any>>({});

export function useUsers() {
  const { fetchWithAuth, getApiUrl } = useApi();

  // 获取用户信息
  async function getUserById(userId: string | number) {
    // 如果缓存中已有用户信息，直接返回
    if (usersCache.value[userId]) {
      return usersCache.value[userId];
    }

    try {
      const response = await fetchWithAuth(
        getApiUrl(`/api/users/${userId}`)
      );

      if (!response.ok) throw new Error(`获取用户信息失败: ${response.status}`);

      const userData = await response.json();

      // 保存到缓存中
      usersCache.value[userId] = userData;

      return userData;
    } catch (error) {
      console.error(`获取用户 ${userId} 信息失败:`, error);
      // 返回一个基本对象，避免前端报错
      return { username: `用户-${userId}` };
    }
  }

  return {
    getUserById,
    usersCache,
  };
}

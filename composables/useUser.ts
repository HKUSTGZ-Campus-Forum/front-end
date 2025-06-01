import { ref } from "vue";
import { useAuth } from "./useAuth";
import { useApi } from "./useApi";

// 用户缓存
const usersCache = ref<Record<string | number, any>>({});

export function useUser() {
  const { fetchWithAuth } = useApi();

  // 根据ID获取用户信息
  async function getUserById(userId: string | number) {
    // 空值检查
    if (!userId) {
      console.warn("尝试获取无效用户ID:", userId);
      return { username: "未知用户" };
    }

    // 如果缓存中已有用户信息，直接返回
    if (usersCache.value[userId]) {
      return usersCache.value[userId];
    }

    try {
      console.log(`尝试获取用户ID:${userId}的信息`);

      const response = await fetchWithAuth(
        `https://dev.unikorn.axfff.com/api/users/${userId}`
      );

      if (!response.ok) {
        console.error(`获取用户信息失败: ${response.status}`);
        return { username: `用户-${userId}` };
      }

      const userData = await response.json();
      console.log(`获取用户${userId}信息成功:`, userData);

      // 保存到缓存中
      usersCache.value[userId] = userData;

      return userData;
    } catch (error) {
      console.error(`获取用户${userId}信息失败:`, error);
      // 返回一个基本对象，避免前端报错
      return { username: `用户-${userId}` };
    }
  }

  // 只获取用户名
  async function getUsernameById(userId: string | number) {
    const user = await getUserById(userId);
    return user?.username || `用户-${userId}`;
  }

  // 清除指定用户缓存
  function clearUserCache(userId: string | number) {
    if (usersCache.value[userId]) {
      delete usersCache.value[userId];
    }
  }

  // 清除所有用户缓存
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

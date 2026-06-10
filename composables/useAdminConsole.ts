import type {
  AdminAuditLog,
  AdminCommentsResponse,
  AdminContestSummary,
  AdminContentSummary,
  AdminCoursesSummary,
  AdminFilesResponse,
  AdminGuguMessagesResponse,
  AdminMatchingSummary,
  AdminOverviewResponse,
  AdminOverviewQuery,
  AdminOverviewTrendsPayload,
  AdminOperationsSummary,
  AdminPostsResponse,
  AdminQuery,
  AdminUsersResponse,
} from "~/types/admin";

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildError(data: any, fallback: string) {
  return new Error(data?.error || data?.message || fallback);
}

function buildQuery(query: Record<string, string | number | undefined | null> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  return params.toString() ? `?${params.toString()}` : "";
}

export function useAdminConsole() {
  const { t } = useI18n();
  const { fetchWithAuth } = useApi();

  async function request<T>(url: string, options: RequestInit = {}, fallback: string): Promise<T> {
    const response = await fetchWithAuth(url, options);
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildError(data, fallback);
    }
    return data as T;
  }

  const getOverview = (query: AdminOverviewQuery = {}) => request<AdminOverviewResponse>(
    `/api/admin/overview${buildQuery(query)}`,
    {},
    t("adminConsole.errors.loadOverview")
  );

  const getOverviewTrends = (query: AdminOverviewQuery = {}) => request<AdminOverviewTrendsPayload>(
    `/api/admin/overview/trends${buildQuery(query)}`,
    {},
    t("adminConsole.errors.loadOverview")
  );

  const getAuditLogs = (query: Record<string, string | number | undefined> = {}) => request<{
    logs: AdminAuditLog[]
    total: number
    page: number
    pages: number
    per_page: number
  }>(
    `/api/admin/audit-logs${buildQuery(query)}`,
    {},
    t("adminConsole.errors.loadAudit")
  );

  const getUsers = (query: AdminQuery = {}) => request<AdminUsersResponse>(
    `/api/admin/users${buildQuery(query)}`,
    {},
    t("adminConsole.errors.loadUsers")
  );

  const updateUserRole = (userId: number, roleName: string, note = "") => request<{ user: unknown }>(
    `/api/admin/users/${userId}/role`,
    { method: "POST", body: { role_name: roleName, note } as any },
    t("adminConsole.errors.updateUser")
  );

  const setUserDeleted = (userId: number, deleted: boolean, note = "") => request<{ user: unknown }>(
    `/api/admin/users/${userId}/${deleted ? "delete" : "restore"}`,
    { method: "POST", body: { note } as any },
    t("adminConsole.errors.updateUser")
  );

  const getContentSummary = () => request<AdminContentSummary>(
    "/api/admin/content/summary",
    {},
    t("adminConsole.errors.loadContent")
  );

  const getCoursesSummary = () => request<AdminCoursesSummary>(
    "/api/admin/courses/summary",
    {},
    t("adminConsole.errors.loadDomains")
  );

  const getMatchingSummary = () => request<AdminMatchingSummary>(
    "/api/admin/matching/summary",
    {},
    t("adminConsole.errors.loadDomains")
  );

  const getContestSummary = () => request<AdminContestSummary>(
    "/api/admin/contest/summary",
    {},
    t("adminConsole.errors.loadDomains")
  );

  const getOperationsSummary = () => request<AdminOperationsSummary>(
    "/api/admin/operations/summary",
    {},
    t("adminConsole.errors.loadDomains")
  );

  const getPosts = (query: AdminQuery = {}) => request<AdminPostsResponse>(
    `/api/admin/content/posts${buildQuery(query)}`,
    {},
    t("adminConsole.errors.loadContent")
  );

  const getComments = (query: AdminQuery = {}) => request<AdminCommentsResponse>(
    `/api/admin/content/comments${buildQuery(query)}`,
    {},
    t("adminConsole.errors.loadContent")
  );

  const getFiles = (query: AdminQuery = {}) => request<AdminFilesResponse>(
    `/api/admin/content/files${buildQuery(query)}`,
    {},
    t("adminConsole.errors.loadContent")
  );

  const getGuguMessages = (query: AdminQuery = {}) => request<AdminGuguMessagesResponse>(
    `/api/admin/content/gugu${buildQuery(query)}`,
    {},
    t("adminConsole.errors.loadContent")
  );

  const setPostDeleted = (postId: number, deleted: boolean, note = "") => request<{ post: unknown }>(
    `/api/admin/content/posts/${postId}/${deleted ? "delete" : "restore"}`,
    { method: "POST", body: { note } as any },
    t("adminConsole.errors.updateContent")
  );

  const setCommentDeleted = (commentId: number, deleted: boolean, note = "") => request<{ comment: unknown }>(
    `/api/admin/content/comments/${commentId}/${deleted ? "delete" : "restore"}`,
    { method: "POST", body: { note } as any },
    t("adminConsole.errors.updateContent")
  );

  const setFileDeleted = (fileId: number, deleted: boolean, note = "") => request<{ file: unknown }>(
    `/api/admin/content/files/${fileId}/${deleted ? "delete" : "restore"}`,
    { method: "POST", body: { note } as any },
    t("adminConsole.errors.updateContent")
  );

  const setGuguDeleted = (messageId: number, deleted: boolean, note = "") => request<{ gugu: unknown }>(
    `/api/admin/content/gugu/${messageId}/${deleted ? "delete" : "restore"}`,
    { method: "POST", body: { note } as any },
    t("adminConsole.errors.updateContent")
  );

  return {
    getOverview,
    getOverviewTrends,
    getAuditLogs,
    getUsers,
    updateUserRole,
    setUserDeleted,
    getContentSummary,
    getCoursesSummary,
    getMatchingSummary,
    getContestSummary,
    getOperationsSummary,
    getPosts,
    getComments,
    getFiles,
    getGuguMessages,
    setPostDeleted,
    setCommentDeleted,
    setFileDeleted,
    setGuguDeleted,
  };
}


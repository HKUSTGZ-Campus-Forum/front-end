import type {
  AdminListQuery,
  Feedback,
  FeedbackAdminListResponse,
  FeedbackMergeAdminListResponse,
  FeedbackMergeRequest,
  FeedbackMergeRequestStatus,
  FeedbackStatus,
} from "~/types/feedback";

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildApiError(message: string, fallback: string) {
  return new Error(message || fallback);
}

export function useFeedbackAdmin() {
  const { t } = useI18n();
  const { fetchWithAuth } = useApi();

  function buildQuery<TStatus extends string>(query: AdminListQuery<TStatus> = {}) {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.page) params.set("page", String(query.page));
    if (query.per_page) params.set("per_page", String(query.per_page));
    if (query.sort) params.set("sort", query.sort);
    return params.toString() ? `?${params.toString()}` : "";
  }

  async function listFeedbacks(query: AdminListQuery<FeedbackStatus> = {}): Promise<FeedbackAdminListResponse> {
    const response = await fetchWithAuth(`/api/admin/feedbacks${buildQuery(query)}`);
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.listFeedbacksFailed"));
    }
    return data as FeedbackAdminListResponse;
  }

  async function listPendingFeedback(): Promise<Feedback[]> {
    const response = await fetchWithAuth("/api/admin/feedbacks/pending");
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.listPendingFeedbackFailed"));
    }
    return data?.feedbacks || [];
  }

  async function listPendingMergeRequests(): Promise<FeedbackMergeRequest[]> {
    const response = await fetchWithAuth("/api/admin/merge-requests/pending");
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.listPendingMergeRequestsFailed"));
    }
    return data?.merge_requests || [];
  }

  async function listMergeRequests(
    query: AdminListQuery<FeedbackMergeRequestStatus> = {}
  ): Promise<FeedbackMergeAdminListResponse> {
    const response = await fetchWithAuth(`/api/admin/merge-requests${buildQuery(query)}`);
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.listMergeRequestsFailed"));
    }
    return data as FeedbackMergeAdminListResponse;
  }

  async function approveFeedback(feedbackId: number): Promise<Feedback> {
    const response = await fetchWithAuth(`/api/admin/feedbacks/${feedbackId}/approve`, {
      method: "POST",
      body: {} as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.approveFeedbackFailed"));
    }
    return data as Feedback;
  }

  async function rejectFeedback(feedbackId: number, note: string): Promise<Feedback> {
    const response = await fetchWithAuth(`/api/admin/feedbacks/${feedbackId}/reject`, {
      method: "POST",
      body: { note } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.rejectFeedbackFailed"));
    }
    return data as Feedback;
  }

  async function closeFeedback(feedbackId: number, note = ""): Promise<Feedback> {
    const response = await fetchWithAuth(`/api/admin/feedbacks/${feedbackId}/close`, {
      method: "POST",
      body: { note } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.closeFeedbackFailed"));
    }
    return data as Feedback;
  }

  async function reopenFeedback(feedbackId: number, note = ""): Promise<Feedback> {
    const response = await fetchWithAuth(`/api/admin/feedbacks/${feedbackId}/reopen`, {
      method: "POST",
      body: { note } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.reopenFeedbackFailed"));
    }
    return data as Feedback;
  }

  async function endFeedbackComments(feedbackId: number): Promise<Feedback> {
    const response = await fetchWithAuth(`/api/admin/feedbacks/${feedbackId}/end-comments`, {
      method: "POST",
      body: {} as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.endCommentsFailed"));
    }
    return data as Feedback;
  }

  async function resumeFeedbackComments(feedbackId: number): Promise<Feedback> {
    const response = await fetchWithAuth(`/api/admin/feedbacks/${feedbackId}/resume-comments`, {
      method: "POST",
      body: {} as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.resumeCommentsFailed"));
    }
    return data as Feedback;
  }

  async function approveMergeRequest(mergeRequestId: number, note: string): Promise<FeedbackMergeRequest> {
    const response = await fetchWithAuth(`/api/admin/merge-requests/${mergeRequestId}/approve`, {
      method: "POST",
      body: { note } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.approveMergeRequestFailed"));
    }
    return data as FeedbackMergeRequest;
  }

  async function rejectMergeRequest(mergeRequestId: number, note: string): Promise<FeedbackMergeRequest> {
    const response = await fetchWithAuth(`/api/admin/merge-requests/${mergeRequestId}/reject`, {
      method: "POST",
      body: { note } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.rejectMergeRequestFailed"));
    }
    return data as FeedbackMergeRequest;
  }

  async function hideFeedbackComment(commentId: number, reason: string) {
    const response = await fetchWithAuth(`/api/admin/feedback-comments/${commentId}/hide`, {
      method: "POST",
      body: { reason } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.hideCommentFailed"));
    }
    return data;
  }

  async function hideFeedbackMergeComment(commentId: number, reason: string) {
    const response = await fetchWithAuth(`/api/admin/feedback-merge-comments/${commentId}/hide`, {
      method: "POST",
      body: { reason } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.adminApi.hideCommentFailed"));
    }
    return data;
  }

  return {
    listFeedbacks,
    listPendingFeedback,
    listMergeRequests,
    listPendingMergeRequests,
    approveFeedback,
    rejectFeedback,
    closeFeedback,
    reopenFeedback,
    endFeedbackComments,
    resumeFeedbackComments,
    approveMergeRequest,
    rejectMergeRequest,
    hideFeedbackComment,
    hideFeedbackMergeComment,
  };
}

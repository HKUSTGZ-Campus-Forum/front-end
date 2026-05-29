import type {
  CreateFeedbackCommentPayload,
  CreateFeedbackMergeCommentPayload,
  CreateFeedbackMergeRequestPayload,
  CreateFeedbackPayload,
  Feedback,
  FeedbackMergeRequest,
  FeedbackComment,
  FeedbackMergeComment,
  FeedbackVersion,
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

export function useFeedback() {
  const { t } = useI18n();
  const { fetchPublic, fetchWithAuth } = useApi();
  const { accessToken } = useAuth();

  async function listFeedback(): Promise<Feedback[]> {
    const response = await fetchPublic("/api/feedbacks");
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.listFailed"));
    }
    return data?.feedbacks || [];
  }

  async function listMyFeedback(): Promise<Feedback[]> {
    const response = await fetchWithAuth("/api/feedbacks/mine");
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.listMineFailed"));
    }
    return data?.feedbacks || [];
  }

  async function getFeedback(id: number): Promise<Feedback> {
    const response = accessToken.value
      ? await fetchWithAuth(`/api/feedbacks/${id}`)
      : await fetchPublic(`/api/feedbacks/${id}`);
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.detailFailed"));
    }
    return data as Feedback;
  }

  async function getFeedbackVersions(id: number): Promise<FeedbackVersion[]> {
    const response = accessToken.value
      ? await fetchWithAuth(`/api/feedbacks/${id}/versions`)
      : await fetchPublic(`/api/feedbacks/${id}/versions`);
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.versionsFailed"));
    }
    return data?.versions || [];
  }

  async function createFeedback(payload: CreateFeedbackPayload): Promise<Feedback> {
    const response = await fetchWithAuth("/api/feedbacks", {
      method: "POST",
      body: payload as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.createFailed"));
    }
    return data as Feedback;
  }

  async function createComment(
    feedbackId: number,
    payload: CreateFeedbackCommentPayload,
  ): Promise<FeedbackComment> {
    const response = await fetchWithAuth(`/api/feedbacks/${feedbackId}/comments`, {
      method: "POST",
      body: payload as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.commentCreateFailed"));
    }
    return data as FeedbackComment;
  }

  async function createMergeRequest(
    feedbackId: number,
    payload: CreateFeedbackMergeRequestPayload,
  ): Promise<FeedbackMergeRequest> {
    const response = await fetchWithAuth(`/api/feedbacks/${feedbackId}/merge-requests`, {
      method: "POST",
      body: payload as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.mergeRequestCreateFailed"));
    }
    return data as FeedbackMergeRequest;
  }

  async function getMergeRequest(id: number): Promise<FeedbackMergeRequest> {
    const response = accessToken.value
      ? await fetchWithAuth(`/api/merge-requests/${id}`)
      : await fetchPublic(`/api/merge-requests/${id}`);
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.mergeRequestDetailFailed"));
    }
    return data as FeedbackMergeRequest;
  }

  async function updateMergeRequestContent(
    mergeRequestId: number,
    proposedMarkdownContent: string,
  ): Promise<FeedbackMergeRequest> {
    const response = await fetchWithAuth(`/api/merge-requests/${mergeRequestId}/proposed-content`, {
      method: "PUT",
      body: {
        proposed_markdown_content: proposedMarkdownContent,
      } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.mergeRequestUpdateFailed"));
    }
    return data as FeedbackMergeRequest;
  }

  async function createMergeRequestComment(
    mergeRequestId: number,
    payload: CreateFeedbackMergeCommentPayload,
  ): Promise<FeedbackMergeComment> {
    const response = await fetchWithAuth(`/api/merge-requests/${mergeRequestId}/comments`, {
      method: "POST",
      body: payload as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.mergeCommentCreateFailed"));
    }
    return data as FeedbackMergeComment;
  }

  async function authorRequestChanges(mergeRequestId: number, note: string): Promise<FeedbackMergeRequest> {
    const response = await fetchWithAuth(`/api/merge-requests/${mergeRequestId}/request-changes`, {
      method: "POST",
      body: { note } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.authorRequestChangesFailed"));
    }
    return data as FeedbackMergeRequest;
  }

  async function authorRejectMergeRequest(mergeRequestId: number, note: string): Promise<FeedbackMergeRequest> {
    const response = await fetchWithAuth(`/api/merge-requests/${mergeRequestId}/reject`, {
      method: "POST",
      body: { note } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.authorRejectFailed"));
    }
    return data as FeedbackMergeRequest;
  }

  async function authorAcceptMergeRequest(mergeRequestId: number, note: string): Promise<FeedbackMergeRequest> {
    const response = await fetchWithAuth(`/api/merge-requests/${mergeRequestId}/accept`, {
      method: "POST",
      body: { note } as any,
    });
    const data = await readJsonSafe(response);
    if (!response.ok) {
      throw buildApiError(data?.error, t("feedbackModule.api.authorAcceptFailed"));
    }
    return data as FeedbackMergeRequest;
  }

  return {
    listFeedback,
    listMyFeedback,
    getFeedback,
    getFeedbackVersions,
    createFeedback,
    createComment,
    createMergeRequest,
    getMergeRequest,
    updateMergeRequestContent,
    createMergeRequestComment,
    authorRequestChanges,
    authorRejectMergeRequest,
    authorAcceptMergeRequest,
  };
}

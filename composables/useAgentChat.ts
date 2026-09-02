export interface AgentStatus {
  enabled: boolean;
  configured: boolean;
  model: string | null;
  client_provider_allowed?: boolean;
  server_provider?: {
    enabled: boolean;
    configured: boolean;
    model: string | null;
  };
}

export interface AgentProviderPayload {
  base_url: string;
  api_key: string;
  model: string;
}

export interface AgentMessage {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  created_at: string | null;
  pending?: boolean;
}

export interface AgentConversation {
  id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
  last_message_at: string | null;
  message_count: number;
  messages?: AgentMessage[];
}

export class AgentApiError extends Error {
  status: number;
  code?: string;
  payload: Record<string, any>;

  constructor(
    message: string,
    status: number,
    payload: Record<string, any> = {}
  ) {
    super(message);
    this.name = "AgentApiError";
    this.status = status;
    this.code = typeof payload.code === "string" ? payload.code : undefined;
    this.payload = payload;
  }
}

export function useAgentChat() {
  const { fetchWithAuth } = useApi();

  async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetchWithAuth(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AgentApiError(
        payload.error || `Assistant request failed (${response.status})`,
        response.status,
        payload
      );
    }
    return payload as T;
  }

  function getStatus(): Promise<AgentStatus> {
    return request<AgentStatus>("/api/agent/status");
  }

  async function listConversations(): Promise<AgentConversation[]> {
    const payload = await request<{ conversations: AgentConversation[] }>(
      "/api/agent/conversations"
    );
    return payload.conversations;
  }

  function getConversation(id: string): Promise<AgentConversation> {
    return request<AgentConversation>(
      `/api/agent/conversations/${encodeURIComponent(id)}`
    );
  }

  async function deleteConversation(id: string): Promise<void> {
    const response = await fetchWithAuth(
      `/api/agent/conversations/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new AgentApiError(
        payload.error || `Unable to delete conversation (${response.status})`,
        response.status,
        payload
      );
    }
  }

  function sendMessage(
    message: string,
    conversationId: string | null,
    provider?: AgentProviderPayload | null
  ): Promise<{
    conversation: AgentConversation;
    user_message: AgentMessage;
    assistant_message: AgentMessage;
  }> {
    const body: {
      message: string;
      conversation_id: string | null;
      provider?: AgentProviderPayload;
    } = {
      message,
      conversation_id: conversationId,
    };
    if (provider) body.provider = provider;

    return request("/api/agent/chat", {
      method: "POST",
      body: body as any,
    });
  }

  return {
    getStatus,
    listConversations,
    getConversation,
    deleteConversation,
    sendMessage,
  };
}

export function agentErrorI18nKey(code: string | undefined): string {
  switch (code) {
    case "agent_unavailable":
      return "assistant.errors.unavailable";
    case "agent_request_failed":
      return "assistant.errors.requestFailed";
    case "message_too_long":
      return "assistant.errors.tooLong";
    case "rate_limited":
      return "assistant.errors.rateLimited";
    case "conversation_not_found":
      return "assistant.errors.notFound";
    default:
      return "assistant.errors.generic";
  }
}

export function canSendAgentMessage(
  draft: string,
  sending: boolean,
  available: boolean
): boolean {
  return available && !sending && draft.trim().length > 0;
}

export interface SyncHandoffGrant {
  id: string; status: string; credential_issued: boolean; policy_digest: string
  policy: { direction: 'export' | 'import'; resource: string; fields: Record<string, string>; record_scope: string;
    expires_at: string; retention_days: number; source_sha: string; artifact_digest: string;
    deletion_policy: string; conflict_policy: string }
}
export const syncExchangeErrors = [
  [401, 'sync_invalid_credential', 'credentialError'],
  [403, 'sync_not_approved', 'approvalError'],
  [403, 'sync_direction_denied', 'directionError'],
  [404, 'not_found', 'notFoundError'],
  [409, 'sync_review_changed', 'reviewError'],
  [409, 'sync_version_conflict / sync_event_conflict', 'conflictError'],
  [400, 'sync_invalid_contract', 'requestError'],
  [422, 'sync_field_violation', 'fieldError'],
  [429, 'sync_rate_limited', 'rateError'],
  [502, 'sync_adapter_rejected / sync_invalid_response / sync_response_too_large', 'adapterError'],
  [503, 'sync_runtime_unavailable', 'runtimeError'],
] as const

export function syncGatewayUrl(id: string, browserOrigin: string, publicApiBase = '') {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('invalid_grant_id')
  const base = new URL(publicApiBase || browserOrigin, browserOrigin)
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) throw new Error('invalid_api_origin')
  return new URL(`/api/makerspace/exchange/${id}`, base.origin).href
}
const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`
export function buildSyncHandoff(grant: SyncHandoffGrant, endpoint: string, t: (key: string) => string) {
  const text = (key: string) => t(`makerspace.sync.handoff.${key}`)
  const json = (value: unknown) => JSON.stringify(value, null, 2)
  const curl = (body: unknown) => `curl --request POST ${shellQuote(endpoint)} \\\n  --header 'Authorization: Bearer <SYNC_CREDENTIAL>' \\\n  --header 'Content-Type: application/json' \\\n  --data ${shellQuote(JSON.stringify(body))}`
  const data = Object.fromEntries(Object.entries(grant.policy.fields).map(([name, kind]) =>
    [name, kind === 'boolean' ? false : ['integer', 'number'].includes(kind) ? 1 : 'example']))
  const sections: { key: string; title: string; text: string; code?: string }[] = []
  const add = (key: string, code?: string) => sections.push({ key, title: text(`${key}Title`), text: text(key), code })
  const p = grant.policy
  add('authorization', json({ status: grant.status, credential_issued: grant.credential_issued,
    resource: p.resource, direction: p.direction, fields: p.fields, record_scope: p.record_scope,
    expires_at: p.expires_at, retention_days: p.retention_days, deletion_policy: p.deletion_policy,
    conflict_policy: p.conflict_policy, source_sha: p.source_sha, artifact_digest: p.artifact_digest, policy_digest: grant.policy_digest }))
  add('authentication', `POST ${endpoint}\nAuthorization: Bearer <SYNC_CREDENTIAL>\nContent-Type: application/json`)
  if (p.direction === 'export') {
    add('exportFirst', curl({ direction: 'export', cursor: '', limit: 50 }))
    add('exportResponse', json({ records: [{ id: 'school:1', version: 101, deleted: false, data }], next_cursor: '101' }))
    add('exportNext', curl({ direction: 'export', cursor: '101', limit: 50 }))
    add('exportEnd', json({ records: [], next_cursor: '101' }))
    add('exportDelete', json({ records: [{ id: 'school:1', version: 102, deleted: true, data: {} }], next_cursor: '102' }))
  } else {
    add('importFirst', curl({ direction: 'import', event_id: 'external-event-1', record_id: 'external:1', expected_version: 0, data }))
    add('importResponse', json({ event_id: 'external-event-1', record_id: 'external:1', version: 1, status: 'applied' }))
    add('importRetry')
    add('importDelete', curl({ direction: 'import', event_id: 'external-event-2', record_id: 'external:1', expected_version: 1, deleted: true, data: {} }))
  }
  add('limits')
  add('errors', syncExchangeErrors.map(([status, code, key]) => `${status} ${code}\n${text(key)}`).join('\n\n'))
  const document = [text('title'), text('intro'), text('aiBoundary'), ...sections.map(s =>
    `## ${s.title}\n${s.text}${s.code ? `\n\n${s.code}` : ''}`)].join('\n\n')
  return { sections, document }
}

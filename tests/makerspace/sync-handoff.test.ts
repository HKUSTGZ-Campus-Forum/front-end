import { describe, expect, it } from 'vitest'
import { buildSyncHandoff, syncGatewayUrl, type SyncHandoffGrant } from '../../utils/makerspaceSyncHandoff'
import en from '../../i18n/locales/en.json'
import zh from '../../i18n/locales/zh.json'
const id = 'a'.repeat(32)
const endpoint = `https://school.example/api/makerspace/exchange/${id}`
const grant: SyncHandoffGrant = { id, status: 'approved', credential_issued: true, policy_digest: 'b'.repeat(64), policy: {
  direction: 'export', resource: 'teams', fields: { title: 'string', size: 'integer', active: 'boolean' }, record_scope: 'public_teams',
  expires_at: '2026-10-01T00:00:00Z', retention_days: 7, source_sha: 'c'.repeat(40), artifact_digest: 'd'.repeat(64),
  deletion_policy: 'Remove copies', conflict_policy: 'School authoritative',
} }
const translator = (locale: typeof en) => (key: string) => key.split('.').reduce((obj: any, segment) => obj[segment], locale) as string

describe('scoped sync handoff', () => {
  it('uses the public API origin without leaking internal routing or allowing arbitrary grant paths', () => {
    expect(syncGatewayUrl(id, 'https://school.example')).toBe(endpoint)
    expect(syncGatewayUrl(id, 'http://localhost:3000', 'https://dev.example/')).toBe(`https://dev.example/api/makerspace/exchange/${id}`)
    for (const value of ['../other', '//evil.example', 'x'.repeat(32)]) expect(() => syncGatewayUrl(value, 'https://school.example')).toThrow()
    expect(() => syncGatewayUrl(id, 'https://user:password@school.example')).toThrow()
  })
  it.each([en, zh])('provides exact selected fields, both export requests and a credential placeholder', locale => {
    const result = buildSyncHandoff({ ...grant, token: 'msx_DO_NOT_COPY', unrelated: 'private' } as SyncHandoffGrant, endpoint, translator(locale))
    const response = JSON.parse(result.sections.find(x => x.key === 'exportResponse')!.code!)
    expect(response.records[0].data).toEqual({ title: 'example', size: 1, active: false })
    expect(result.document).toContain('Authorization: Bearer <SYNC_CREDENTIAL>')
    expect(result.document).toContain('"cursor":""')
    expect(result.document).toContain('"cursor":"101"')
    expect(result.document).toContain('sync_invalid_credential')
    expect(result.document).toContain('sync_not_approved')
    expect(result.document).not.toContain('msx_DO_NOT_COPY')
    expect(result.document).not.toContain('private')
    expect(result.sections.some(x => x.key.startsWith('import'))).toBe(false)
  })
  it('generates import, retry and deletion instructions without issuing another request', () => {
    const result = buildSyncHandoff({ ...grant, status: 'expired', policy: { ...grant.policy, direction: 'import' } }, endpoint, translator(en))
    expect(result.document).toContain('"status": "expired"')
    expect(result.document).toContain('"expected_version":0')
    expect(result.document).toContain('"deleted":true,"data":{}')
    expect(result.document).toContain('identical event_id and body')
    expect(result.sections.some(x => x.key.startsWith('export'))).toBe(false)
  })
})

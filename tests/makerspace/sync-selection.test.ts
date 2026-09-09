import { describe, expect, it } from 'vitest'
import type { SyncCatalog } from '../../types/makerspace-sync'
import { selectSyncContract } from '../../utils/makerspaceSync'
const catalog: SyncCatalog = {
  deployment_id: 'published', source_sha: 'a'.repeat(40), artifact_digest: 'b'.repeat(64), contract_digest: 'c'.repeat(64),
  resources: { teams: { fields: { title: 'string', size: 'integer' }, directions: ['export'], record_scope: 'public_teams' } },
}
describe('published sync field selection', () => {
  it('uses the selected published types, scope and version without requesting other fields', () => {
    expect(selectSyncContract(catalog, 'teams', 'export', ['size'])).toEqual({
      deployment_id: 'published', contract_digest: 'c'.repeat(64), direction: 'export', resource: 'teams',
      record_scope: 'public_teams', fields: { size: 'integer' },
    })
  })
  it('rejects unsupported directions, unknown fields, no selection and duplicate selection', () => {
    expect(() => selectSyncContract(catalog, 'teams', 'import', ['title'])).toThrow()
    for (const fields of [[], ['email'], ['title', 'title'], ['toString']]) {
      expect(() => selectSyncContract(catalog, 'teams', 'export', fields)).toThrow()
    }
    expect(() => selectSyncContract(catalog, 'toString', 'export', ['title'])).toThrow()
  })
})

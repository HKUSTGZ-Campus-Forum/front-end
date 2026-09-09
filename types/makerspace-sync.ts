export type SyncDirection = 'export' | 'import'
export type SyncFieldType = 'string' | 'integer' | 'number' | 'boolean'
export interface SyncResource {
  fields: Record<string, SyncFieldType>
  directions: SyncDirection[]
  record_scope: string
}
export interface SyncCatalog {
  resources: Record<string, SyncResource>
  deployment_id: string
  source_sha: string
  artifact_digest: string
  contract_digest: string
}

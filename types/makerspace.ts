export interface MakerSettings {
  runtime: 'static' | 'node' | 'python'
  directory: string
  output_directory: string
  build_command: string
  start_command: string
}
export interface MakerDraft {
  slug: string
  title_zh: string
  title_en: string
  description_zh: string
  description_en: string
  category: string
  repository: string
  branch: string
  auto_deploy: boolean
  settings: MakerSettings
}
export interface MakerDeployment {
  id: string
  source_sha: string | null
  status: string
  review_status: string
  publication_status: string
  review_note: string | null
  artifact_digest: string | null
  error_code: string | null
  log: string
  created_at: string
  snapshot: { metadata: Pick<MakerDraft, 'title_zh' | 'title_en' | 'description_zh' | 'description_en' | 'category'>; repository: string; settings: MakerSettings }
}
export interface MakerSpace extends MakerDraft {
  id: string
  kind: 'hosted' | 'external'
  status: string
  cover_url?: string | null
  likes_count?: number
  favorites_count?: number
  is_liked?: boolean
  is_favorited?: boolean
  is_owner: boolean
  owner: { id: number; username: string } | null
  public_key?: string
  environment_names?: string[]
  version: number
  published_deployment_id: string | null
  launch_path?: string
  deployments?: MakerDeployment[]
}
export interface MakerCapabilities {
  hosting_ready: boolean
  credentials_ready: boolean
  max_spaces: number
  quota: { cpu: number; memory_mb: number; storage_mb: number; build_seconds: number }
}

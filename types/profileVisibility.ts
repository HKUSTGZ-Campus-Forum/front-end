export interface ProfileVisibility {
  favorite_spaces: boolean
  created_spaces: boolean
  recent_posts: boolean
}

export const defaultProfileVisibility = (): ProfileVisibility => ({
  favorite_spaces: false, created_spaces: true, recent_posts: true,
})

export function parseProfileVisibility(value: unknown): ProfileVisibility {
  const defaults = defaultProfileVisibility()
  if (!value || typeof value !== 'object') return defaults
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
    key, typeof (value as Record<string, unknown>)[key] === 'boolean' ? (value as Record<string, unknown>)[key] : fallback,
  ])) as unknown as ProfileVisibility
}

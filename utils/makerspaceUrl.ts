/** Public sharing always uses the permanent school URL; navigation stays relative. */
export const MAKERSPACE_PUBLIC_PREFIX = 'https://unikorn.hkust-gz.edu.cn/makerspace'
export const TEAMUP_SPACE_PATH = '/makerspace/teamup'
export function makerSpaceUrl(slug: string) {
  return `${MAKERSPACE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}`
}
export function teamUpInnerPath(path: string, hostPrefix = TEAMUP_SPACE_PATH) {
  const unlocalized = path.replace(/^\/en(?=\/)/, '')
  if (unlocalized === hostPrefix || unlocalized === `${hostPrefix}/`) return '/'
  return unlocalized.startsWith(`${hostPrefix}/`) ? unlocalized.slice(hostPrefix.length) : '/'
}

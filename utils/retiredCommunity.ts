/** Retired public community routes must never render their interactive pages. */
export function retiredCommunityDestination(pathname: string): string | null {
  let path: string
  try {
    path = decodeURIComponent(pathname).replace(/\/+/g, '/').toLowerCase()
  } catch {
    return null
  }
  const match = path.match(/^\/(en\/)?(forum|gugu|feedback|club|activity|help\/rules)(?:\/|$)/)
  if (!match) return null
  const prefix = match[1] ? '/en' : ''
  return `${prefix}${match[2] === 'help/rules' ? '/help/guide' : '/announcements'}`
}

interface MeetCampusNavigationUser {
  email?: string | null
  email_verified?: boolean
  is_deleted?: boolean
}

export const MEETCAMPUS_BETA_EMAILS = [
  'wtao565@connect.hkust-gz.edu.cn',
  'jli022@connect.hkust-gz.edu.cn',
] as const

const meetCampusBetaEmailSet = new Set<string>(MEETCAMPUS_BETA_EMAILS)

export function canSeeMeetCampusNavigation(
  isLoggedIn: boolean,
  user: MeetCampusNavigationUser | null | undefined,
): boolean {
  return Boolean(
    isLoggedIn
    && user?.email_verified === true
    && user.is_deleted !== true
    && meetCampusBetaEmailSet.has(user.email?.trim().toLocaleLowerCase() ?? ''),
  )
}

export function getMeetCampusHref(locale: string | null | undefined): string {
  return locale?.toLocaleLowerCase().startsWith('en')
    ? '/meetcampus/en/'
    : '/meetcampus/'
}

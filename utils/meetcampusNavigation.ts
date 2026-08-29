interface MeetCampusNavigationUser {
  email?: string | null
  email_verified?: boolean
  is_deleted?: boolean
}

export const MEETCAMPUS_BETA_EMAIL = 'wtao565@connect.hkust-gz.edu.cn'

export function canSeeMeetCampusNavigation(
  isLoggedIn: boolean,
  user: MeetCampusNavigationUser | null | undefined,
): boolean {
  return Boolean(
    isLoggedIn
    && user?.email_verified === true
    && user.is_deleted !== true
    && user.email?.trim().toLocaleLowerCase() === MEETCAMPUS_BETA_EMAIL,
  )
}

export function getMeetCampusHref(locale: string | null | undefined): string {
  return locale?.toLocaleLowerCase().startsWith('en')
    ? '/meetcampus/en/'
    : '/meetcampus/'
}

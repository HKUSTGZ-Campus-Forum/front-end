import { retiredCommunityDestination } from '../../utils/retiredCommunity'

export default defineEventHandler((event) => {
  const destination = retiredCommunityDestination(getRequestURL(event).pathname)
  if (destination) return sendRedirect(event, destination, 308)
})

import { retiredCommunityDestination } from '~/utils/retiredCommunity'

export default defineNuxtRouteMiddleware((to) => {
  const destination = retiredCommunityDestination(to.path)
  if (destination) return navigateTo(destination, { redirectCode: 308, replace: true })
})

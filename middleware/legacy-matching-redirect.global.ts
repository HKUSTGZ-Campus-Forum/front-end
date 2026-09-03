export default defineNuxtRouteMiddleware((to) => {
  const match = to.path.match(/^\/(en\/)?matching(?:\/|$)/)

  if (!match) return

  return navigateTo(
    {
      path: match[1] ? '/en/teamup' : '/teamup',
      query: to.query,
      hash: to.hash,
    },
    {
      redirectCode: 308,
      replace: true,
    },
  )
})

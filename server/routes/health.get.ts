export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);

  setResponseHeader(event, "Cache-Control", "no-store");

  return {
    status: "ok",
    service: "campus-forum-frontend",
    version: config.public.appBuildVersion,
  };
});

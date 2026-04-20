import { defineEventHandler, getHeader, getRequestURL, setResponseHeader } from "h3";

const IMMUTABLE_ASSET_PATH = "/_nuxt/";
const SW_PATH = "/sw.js";

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname;
  const acceptHeader = getHeader(event, "accept") || "";

  if (pathname.startsWith(IMMUTABLE_ASSET_PATH)) {
    setResponseHeader(event, "Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  if (pathname === SW_PATH || pathname === "/manifest.json" || pathname === "/browserconfig.xml") {
    setResponseHeader(event, "Cache-Control", "no-cache, must-revalidate");
    return;
  }

  if (isHtmlDocumentRequest(pathname, acceptHeader)) {
    setResponseHeader(event, "Cache-Control", "no-cache, must-revalidate");
  }
});

function isHtmlDocumentRequest(pathname: string, acceptHeader: string) {
  if (pathname.startsWith("/api/")) {
    return false;
  }

  if (!acceptHeader.includes("text/html")) {
    return false;
  }

  if (pathname === "/") {
    return true;
  }

  const lastSegment = pathname.split("/").pop() || "";
  return !lastSegment.includes(".");
}

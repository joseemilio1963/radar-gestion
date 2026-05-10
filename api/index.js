import handler from "../server.js";

export default function vercelApiIndex(req, res) {
  const originalUrl = req.url || "/";
  const parsed = new URL(originalUrl, "http://localhost");

  const query = req.query || {};

  let pathParam =
    query.path ||
    query.__path ||
    parsed.searchParams.get("path") ||
    parsed.searchParams.get("__path") ||
    "";

  if (Array.isArray(pathParam)) {
    pathParam = pathParam.join("/");
  }

  pathParam = String(pathParam || "").replace(/^\/+/, "");

  if (pathParam) {
    parsed.searchParams.delete("path");
    parsed.searchParams.delete("__path");

    const qs = parsed.searchParams.toString();
    req.url = "/api/" + pathParam + (qs ? "?" + qs : "");
  }

  return handler(req, res);
}
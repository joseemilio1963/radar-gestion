import handler from "../server.js";

export default function vercelApiIndex(req, res) {
  const query = req.query || {};
  let pathParam = query.path || query.__path || "";

  if (Array.isArray(pathParam)) {
    pathParam = pathParam.join("/");
  }

  pathParam = String(pathParam || "").replace(/^\/+/, "");

  if (pathParam) {
    const url = new URL(req.url || "/", "http://localhost");
    url.searchParams.delete("path");
    url.searchParams.delete("__path");

    const qs = url.searchParams.toString();
    req.url = "/api/" + pathParam + (qs ? "?" + qs : "");
  }

  return handler(req, res);
}
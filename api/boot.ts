import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

import { SignalingServer } from "./signaling";
import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import fs from "node:fs";
import path from "node:path";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  await next();
});

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get("/api/health", (c) => c.json({ status: "ok" }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const port = parseInt(process.env.PORT || "3000");

  // Resolve dist path
  const candidates = [
    path.resolve(import.meta.dirname, "public"),
    path.resolve(import.meta.dirname, "../dist/public"),
    path.resolve(process.cwd(), "dist/public"),
  ];
  let distPath = candidates[0];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.existsSync(path.join(c, "index.html"))) {
      distPath = c;
      break;
    }
  }

  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
  };

  const honoListener = getRequestListener(app.fetch);

  const server = createServer((req, res) => {
    const urlPath = req.url || "/";

    // API routes go to Hono (properly converted to web Request)
    if (urlPath.startsWith("/api/")) {
      honoListener(req, res);
      return;
    }

    // Static file serving
    const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\$))+/, "");
    const filePath = path.join(distPath, safePath);

    if (filePath.startsWith(distPath) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      });
      res.end(fs.readFileSync(filePath));
      return;
    }

    // SPA fallback
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(indexPath));
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  });

  // Attach WebSocket signaling
  const signaling = new SignalingServer();
  signaling.attach(server, "/ws");

  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    const publicUrl = process.env.RENDER_EXTERNAL_URL
      || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : null);
    console.log(publicUrl
      ? `Server running — public URL: ${publicUrl}`
      : `Server running on http://${host}:${port}/`);
  });
}

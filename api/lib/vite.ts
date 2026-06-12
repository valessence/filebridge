import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import fs from "fs";
import path from "path";

const __dirname = import.meta.dirname;

function getDistPath(): string {
  const candidates = [
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "../dist/public"),
    path.resolve(process.cwd(), "dist/public"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.existsSync(path.join(c, "index.html"))) {
      return c;
    }
  }
  return candidates[0];
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = getDistPath();

  app.use("*", async (c, next) => {
    const urlPath = c.req.path;
    // Skip API routes
    if (urlPath.startsWith("/api/")) {
      return next();
    }

    // Security: prevent directory traversal
    const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\$))+/, "");
    const filePath = path.join(distPath, safePath);

    // Ensure the resolved path is within distPath
    if (!filePath.startsWith(distPath)) {
      return next();
    }

    // Try to serve the file
    let target = filePath;
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      const mime = getMimeType(target);
      const content = fs.readFileSync(target);
      return c.newResponse(content, 200, {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
    }

    // Try as directory with index.html
    const indexPath = path.join(target, "index.html");
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, "utf-8");
      return c.html(content);
    }

    return next();
  });

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, "utf-8");
      return c.html(content);
    }
    return c.json({ error: "Not Found" }, 404);
  });
}

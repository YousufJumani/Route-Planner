import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd(), "dist");
const port = 4175;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

function toFile(urlPath) {
  const input = urlPath === "/" ? "/index.html" : urlPath;
  return join(root, normalize(input).replace(/^([.][.][/\\])+/, ""));
}

if (!existsSync(root)) {
  console.error("Run npm run build first.");
  process.exit(1);
}

createServer((req, res) => {
  const file = toFile(req.url || "/");
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}`);
});

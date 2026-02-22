const fs = require("fs/promises");
const path = require("path");
const vm = require("vm");

const REMOTE_ROOT =
  "https://1812378450.v.123pan.cn/1812378450/2ds/web/articles";
const POSTS_JSON_URL = `${REMOTE_ROOT}/posts.json`;
const CACHE_CONTROL =
  "public, max-age=0, s-maxage=600, stale-while-revalidate=86400";

let markedPromise;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeId(rawId) {
  const id = String(rawId || "").trim();
  if (!id) return null;
  if (!/^[^/\\?#]+$/.test(id)) return null;
  if (id.startsWith(".") || id.endsWith(".") || id.includes("..")) return null;
  return id;
}

function createArticlePath(id) {
  return `/article/p/${encodeURIComponent(id)}`;
}

function buildCanonicalUrl(event, pathname) {
  const headers = event.headers || {};
  const proto = headers["x-forwarded-proto"] || "https";
  const host = headers["x-forwarded-host"] || headers.host || "2ds.lian.moe";
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${proto}://${host}${cleanPath}`;
}

async function getMarked() {
  if (!markedPromise) {
    const markedPath = path.join(__dirname, "../../article/js/marked.js");
    markedPromise = fs.readFile(markedPath, "utf8").then((source) => {
      const withoutExports = source.replace(/export\{[\s\S]*?\};/u, "");
      const wrappedSource = `${withoutExports}\n;globalThis.__marked = g;`;
      const context = { globalThis: {}, console };
      vm.createContext(context);
      vm.runInContext(wrappedSource, context, { filename: "marked.js" });
      if (!context.globalThis.__marked) {
        throw new Error("Failed to load markdown parser.");
      }
      return context.globalThis.__marked;
    });
  }
  return markedPromise;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Upstream error ${response.status}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { Accept: "text/plain, text/markdown;q=0.9, */*;q=0.1" },
  });
  if (!response.ok) {
    const error = new Error(`Upstream error ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }
  return response.text();
}

function normalizePosts(rawPosts) {
  if (!Array.isArray(rawPosts)) return [];
  return rawPosts
    .map((post) => {
      const id = sanitizeId(post && post.id);
      if (!id) return null;
      return {
        id,
        title: String((post && post.title) || id),
        desc: String((post && post.desc) || "").trim(),
        date: String((post && post.date) || "").trim(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.localeCompare(a.date);
    });
}

async function fetchPosts() {
  const raw = await fetchJson(POSTS_JSON_URL);
  return normalizePosts(raw);
}

async function fetchPostMarkdown(id) {
  const url = `${REMOTE_ROOT}/posts/${encodeURIComponent(id)}.md`;
  return fetchText(url);
}

function extractTitleFromMarkdown(markdown, fallback) {
  const match = String(markdown).match(/^\s*#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : fallback;
}

function stripMarkdown(markdown) {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDescription(text, maxLength = 150) {
  const clean = stripMarkdown(text);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1)}…`;
}

function baseHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "Cache-Control": CACHE_CONTROL,
  };
}

function renderHeader() {
  return `
  <header class="site-header">
    <div class="container">
      <a href="/article/" class="logo">文章站 - 2d 服社区</a>
      <nav>
        <a href="/article/">首页</a>
        <a href="https://github.com/2ds-community/2ds.lian.moe" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="/" target="_blank">2d 服主页</a>
      </nav>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} 2d 服社区</p>
    </div>
  </footer>`;
}

function renderPage({
  title,
  description,
  canonical,
  ogType = "website",
  mainHtml,
  extraHead = "",
}) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description || "");
  const safeCanonical = escapeHtml(canonical);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${safeCanonical}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeCanonical}">
  <link rel="stylesheet" href="/article/style.css">
  ${extraHead}
</head>
<body>
  ${renderHeader()}
  ${mainHtml}
  ${renderFooter()}
</body>
</html>`;
}

function responseHtml(statusCode, body) {
  return {
    statusCode,
    headers: baseHeaders("text/html; charset=utf-8"),
    body,
  };
}

function responseXml(statusCode, body) {
  return {
    statusCode,
    headers: baseHeaders("application/xml; charset=utf-8"),
    body,
  };
}

function redirectResponse(location, statusCode = 301) {
  return {
    statusCode,
    headers: {
      Location: location,
      "Cache-Control": "public, max-age=300",
    },
    body: "",
  };
}

function renderErrorPage(event, statusCode, title, message) {
  const canonical = buildCanonicalUrl(event, "/article/");
  const html = renderPage({
    title,
    description: message,
    canonical,
    mainHtml: `
      <main class="container" style="min-height: 80vh; padding-top: 2rem;">
        <article class="markdown-body">
          <a href="/article/" class="back-link">← 返回文章列表</a>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(message)}</p>
        </article>
      </main>`,
  });
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
    },
    body: html,
  };
}

module.exports = {
  POSTS_JSON_URL,
  createArticlePath,
  buildCanonicalUrl,
  escapeHtml,
  escapeXml,
  sanitizeId,
  getMarked,
  fetchPosts,
  fetchPostMarkdown,
  extractTitleFromMarkdown,
  buildDescription,
  responseHtml,
  responseXml,
  redirectResponse,
  renderPage,
  renderErrorPage,
};

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const REMOTE_ROOT =
  "https://1812378450.v.123pan.cn/1812378450/2ds/web/articles";
const POSTS_JSON_URL = `${REMOTE_ROOT}/posts.json`;
const SITE_ORIGIN = "https://2ds.lian.moe";

// ── Helpers ──

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
  if (id.startsWith(".") || id.endsWith(".") || id.includes(".."))
    return null;
  return id;
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

function normalizeLastmod(rawDate) {
  const date = String(rawDate || "").trim();
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

// ── Load marked.js via vm (same approach as shared.js) ──

function loadMarked() {
  const markedPath = path.join(ROOT, "article/js/marked.js");
  const source = fs.readFileSync(markedPath, "utf8");
  const withoutExports = source.replace(/export\{[\s\S]*?\};/u, "");
  const wrappedSource = `${withoutExports}\n;globalThis.__marked = g;`;
  const context = { globalThis: {}, console };
  vm.createContext(context);
  vm.runInContext(wrappedSource, context, { filename: "marked.js" });
  if (!context.globalThis.__marked) {
    throw new Error("Failed to load markdown parser.");
  }
  return context.globalThis.__marked;
}

// ── Fetch helpers ──

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.text();
}

async function fetchPosts() {
  const raw = await fetchJson(POSTS_JSON_URL);
  if (!Array.isArray(raw)) return [];
  return raw
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

// ── HTML Templates ──

function renderHeader() {
  return `
  <header class="article-header">
    <div class="article-wrap">
      <a href="/article/" class="logo">2d 服 · 文章</a>
      <nav>
        <a href="/article/">文章</a>
        <a href="/">主页</a>
        <a href="https://github.com/2ds-community/2ds.lian.moe" target="_blank" rel="noopener noreferrer">GitHub</a>
      </nav>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="article-footer">
    <div class="article-wrap">
      <p>&copy; ${new Date().getFullYear()} 2d 服社区</p>
    </div>
  </footer>`;
}

function renderPage({ title, description, canonical, ogType = "website", mainHtml }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description || "");
  const safeCan = escapeHtml(canonical);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${safeCan}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${safeCan}">
  <link rel="stylesheet" href="/css/variables.css">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/article.css">
</head>
<body>
  ${renderHeader()}
  ${mainHtml}
  ${renderFooter()}
</body>
</html>`;
}

// ── Page Generators ──

function generateListPage(posts) {
  const listHtml = posts
    .map(
      (post) => `
        <a href="/article/p/${encodeURIComponent(post.id)}" class="post-item">
          <div class="post-meta">
            <span class="post-date">${escapeHtml(post.date || "")}</span>
          </div>
          <h2 class="post-title">${escapeHtml(post.title)}</h2>
          ${post.desc ? `<p class="post-desc">${escapeHtml(post.desc)}</p>` : ""}
        </a>`
    )
    .join("");

  return renderPage({
    title: "文章 - 2d 服社区",
    description: "2d 服社区文章列表",
    canonical: `${SITE_ORIGIN}/article/`,
    mainHtml: `
    <main class="article-wrap">
      <div class="list-hero">
        <h1>文章</h1>
        <p>来自 2d 服社区的文字</p>
      </div>
      <div class="post-list">
        ${listHtml || "<p>暂时还没有文章。</p>"}
      </div>
    </main>`,
  });
}

function generatePostPage(post, htmlContent) {
  const description = post.desc || buildDescription(post.markdown || "", 150);
  return renderPage({
    title: `${post.title} - 2d 服文章`,
    description: description || `2d 服社区文章：${post.title}`,
    canonical: `${SITE_ORIGIN}/article/p/${encodeURIComponent(post.id)}`,
    ogType: "article",
    mainHtml: `
    <main class="article-wrap">
      <a href="/article/" class="back-link">← 返回文章列表</a>
      <header class="article-hero">
        ${post.date ? `<div class="post-date">${escapeHtml(post.date)}</div>` : ""}
        <h1>${escapeHtml(post.title)}</h1>
        ${post.desc ? `<p class="article-desc">${escapeHtml(post.desc)}</p>` : ""}
      </header>
      <article class="prose">
        ${htmlContent}
      </article>
    </main>`,
  });
}

function generateSitemap(posts) {
  const urls = [
    { path: "/article/", lastmod: null },
    ...posts.map((post) => ({
      path: `/article/p/${encodeURIComponent(post.id)}`,
      lastmod: normalizeLastmod(post.date),
    })),
  ];

  const urlXml = urls
    .map((entry) => {
      const loc = `${SITE_ORIGIN}${entry.path}`;
      const lastmod = entry.lastmod
        ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : "";
      return `<url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`;
    })
    .join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlXml}
</urlset>`;
}

// ── Main Build ──

async function build() {
  console.log("Loading marked.js...");
  const marked = loadMarked();

  console.log("Fetching posts.json...");
  const posts = await fetchPosts();
  console.log(`Found ${posts.length} posts.`);

  // Fetch all markdown files in parallel
  console.log("Fetching markdown files...");
  const results = await Promise.allSettled(
    posts.map(async (post) => {
      const url = `${REMOTE_ROOT}/posts/${encodeURIComponent(post.id)}.md`;
      const markdown = await fetchText(url);
      return { ...post, markdown };
    })
  );

  const validPosts = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      validPosts.push(result.value);
    } else {
      console.warn(`  Skipped: ${result.reason.message}`);
    }
  }

  // Ensure output directories exist
  const articleDir = path.join(ROOT, "article");
  const postDir = path.join(articleDir, "p");
  fs.mkdirSync(postDir, { recursive: true });

  // Generate list page
  const listHtml = generateListPage(validPosts);
  fs.writeFileSync(path.join(articleDir, "index.html"), listHtml, "utf8");
  console.log("  article/index.html");

  // Generate each post page
  for (const post of validPosts) {
    let htmlContent = marked.parse(post.markdown);
    // Strip the leading <h1> since we render the title in article-hero
    htmlContent = htmlContent.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, "");
    const postHtml = generatePostPage(post, htmlContent);
    const filename = `${post.id}.html`;
    fs.writeFileSync(path.join(postDir, filename), postHtml, "utf8");
    console.log(`  article/p/${filename}`);
  }

  // Generate sitemap
  const sitemap = generateSitemap(validPosts);
  fs.writeFileSync(path.join(articleDir, "sitemap.xml"), sitemap, "utf8");
  console.log("  article/sitemap.xml");

  console.log(`\nBuild complete! Generated ${validPosts.length} article pages.`);
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

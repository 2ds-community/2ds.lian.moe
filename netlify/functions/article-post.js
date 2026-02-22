const {
  createArticlePath,
  buildCanonicalUrl,
  escapeHtml,
  sanitizeId,
  getMarked,
  fetchPosts,
  fetchPostMarkdown,
  extractTitleFromMarkdown,
  buildDescription,
  responseHtml,
  renderPage,
  renderErrorPage,
  redirectResponse,
} = require("./shared");

function pickPostMeta(posts, id) {
  return posts.find((post) => post.id === id) || null;
}

function extractIdFromPath(pathname, marker) {
  if (!pathname || !pathname.includes(marker)) return null;
  const idx = pathname.indexOf(marker);
  const value = pathname.slice(idx + marker.length);
  if (!value) return null;
  const segment = value.split("/")[0].split("?")[0].split("#")[0];
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function extractId(event) {
  const query = event.queryStringParameters || {};
  if (query.id) return query.id;
  if (event.pathParameters && event.pathParameters.id) {
    return event.pathParameters.id;
  }

  const candidates = [
    event.path,
    event.rawPath,
    event.rawUrl,
    event.headers && event.headers["x-nf-original-path"],
    event.headers && event.headers["x-original-url"],
  ].filter(Boolean);

  for (const value of candidates) {
    const fromArticleRoute = extractIdFromPath(value, "/article/p/");
    if (fromArticleRoute) return fromArticleRoute;
    const fromFunctionRoute = extractIdFromPath(
      value,
      "/.netlify/functions/article-post/"
    );
    if (fromFunctionRoute) return fromFunctionRoute;
  }

  return null;
}

exports.handler = async (event) => {
  const rawId = extractId(event);

  if (!rawId) {
    return redirectResponse("/article/");
  }

  const id = sanitizeId(rawId);
  if (!id) {
    return renderErrorPage(event, 404, "文章不存在", "无效的文章 ID。");
  }

  try {
    const [markdown, posts, marked] = await Promise.all([
      fetchPostMarkdown(id),
      fetchPosts().catch(() => []),
      getMarked(),
    ]);

    const postMeta = pickPostMeta(posts, id);
    const title =
      (postMeta && postMeta.title) || extractTitleFromMarkdown(markdown, id);
    const description =
      (postMeta && postMeta.desc) || buildDescription(markdown, 150);
    const canonicalPath = createArticlePath(id);
    const canonical = buildCanonicalUrl(event, canonicalPath);
    const htmlContent = marked.parse(markdown);

    const body = renderPage({
      title: `${title} - 文章站`,
      description: description || `2d 服社区文章：${title}`,
      canonical,
      ogType: "article",
      mainHtml: `
        <main class="container" style="min-height: 80vh; padding-top: 2rem;">
          <article class="markdown-body">
            <a href="/article/" class="back-link">← 返回文章列表</a>
            ${postMeta && postMeta.date ? `<div class="post-date">${escapeHtml(postMeta.date)}</div>` : ""}
            ${htmlContent}
          </article>
        </main>`,
    });

    return responseHtml(200, body);
  } catch (error) {
    if (error && error.statusCode === 404) {
      return renderErrorPage(event, 404, "文章不存在", `未找到 ID 为 ${id} 的文章。`);
    }
    return renderErrorPage(
      event,
      502,
      "文章加载失败",
      "上游数据暂时不可用，请稍后重试。"
    );
  }
};

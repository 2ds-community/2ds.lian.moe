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

exports.handler = async (event) => {
  const query = event.queryStringParameters || {};
  const rawId =
    query.id ||
    (event.pathParameters && event.pathParameters.id) ||
    (event.rawPath && event.rawPath.split("/").pop());

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

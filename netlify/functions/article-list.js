const {
  createArticlePath,
  buildCanonicalUrl,
  escapeHtml,
  fetchPosts,
  renderPage,
  responseHtml,
  renderErrorPage,
} = require("./shared");

exports.handler = async (event) => {
  try {
    const posts = await fetchPosts();
    const listHtml = posts
      .map(
        (post) => `
      <a href="${createArticlePath(post.id)}" class="post-item">
        <div class="post-date">${escapeHtml(post.date || "")}</div>
        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        ${post.desc ? `<p>${escapeHtml(post.desc)}</p>` : ""}
      </a>`
      )
      .join("");

    const canonical = buildCanonicalUrl(event, "/article/");
    const body = renderPage({
      title: "文章站",
      description: "2d 服社区文章列表",
      canonical,
      ogType: "website",
      mainHtml: `
        <main class="container" style="min-height: 80vh; padding-top: 2rem;">
          <div class="post-list">
            ${listHtml || "<p>暂时还没有文章。</p>"}
          </div>
        </main>`,
    });

    return responseHtml(200, body);
  } catch (error) {
    return renderErrorPage(
      event,
      502,
      "文章列表加载失败",
      "上游数据暂时不可用，请稍后重试。"
    );
  }
};

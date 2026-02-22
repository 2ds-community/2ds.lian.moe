const {
  createArticlePath,
  buildCanonicalUrl,
  escapeXml,
  fetchPosts,
  responseXml,
} = require("./shared");

function normalizeLastmod(rawDate) {
  const date = String(rawDate || "").trim();
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

exports.handler = async (event) => {
  try {
    const posts = await fetchPosts();
    const urls = [
      { path: "/article/", lastmod: null },
      ...posts.map((post) => ({
        path: createArticlePath(post.id),
        lastmod: normalizeLastmod(post.date),
      })),
    ];

    const urlXml = urls
      .map((entry) => {
        const loc = buildCanonicalUrl(event, entry.path);
        const lastmod = entry.lastmod
          ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>`
          : "";
        return `<url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`;
      })
      .join("");

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlXml}</urlset>`;
    return responseXml(200, body);
  } catch (error) {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    return responseXml(200, body);
  }
};

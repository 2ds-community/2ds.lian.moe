import { marked } from './marked.js';

const app = document.getElementById('app');

// 路由逻辑
async function router() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page') || 'home';
  const postId = params.get('id');

  // 使用 View Transitions API 实现平滑过渡
  if (document.startViewTransition) {
    document.startViewTransition(() => render(page, postId));
  } else {
    render(page, postId);
  }
}

// 核心渲染函数
async function render(page, postId) {
  app.innerHTML = ''; // 清空当前内容
  window.scrollTo(0, 0);

  if (page === 'home') {
    await renderHome();
  } else if (page === 'post' && postId) {
    await renderPost(postId);
  } else {
    app.innerHTML = '<h1>404 Not Found</h1>';
  }
}

// 渲染首页列表
async function renderHome() {
  try {
    const res = await fetch('https://1812378450.v.123pan.cn/1812378450/2ds/web/articles/posts.json');
    const posts = await res.json();
    
    document.title = "文章站";
    
    const listHtml = posts.map(post => `
      <a href="?page=post&id=${post.id}" class="post-item" onclick="handleLink(event)">
        <div class="post-date">${post.date}</div>
        <h2 class="post-title">${post.title}</h2>
        <p>${post.desc}</p>
      </a>
    `).join('');
    
    app.innerHTML = `<div class="post-list">${listHtml}</div>`;
  } catch (error) {
    app.innerHTML = `<p>加载文章列表失败: ${error.message}</p>`;
  }
}

// 渲染单篇文章
async function renderPost(id) {
  try {
    const res = await fetch(`https://1812378450.v.123pan.cn/1812378450/2ds/web/articles/posts/${id}.md`);
    if (!res.ok) throw new Error('文章不存在');
    const text = await res.text();
    
    // 解析 Markdown
    const htmlContent = marked.parse(text);
    
    document.title = `Article - ${id}`;

    app.innerHTML = `
      <article class="markdown-body">
        <a href="?page=home" onclick="handleLink(event)" style="display:inline-block; margin-bottom:1rem; font-size:0.9rem;">← 返回文章列表</a>
        ${htmlContent}
      </article>
    `;
  } catch (error) {
    app.innerHTML = `<h1>文章加载失败</h1><p>${error.message}</p>`;
  }
}

// 拦截链接点击，实现 SPA 无刷新跳转
window.handleLink = (e) => {
  e.preventDefault();
  const url = e.currentTarget.href;
  window.history.pushState({}, '', url);
  router();
};

// 监听浏览器前进/后退
window.addEventListener('popstate', router);

// 初始化
router();
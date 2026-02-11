// 简单的头部组件
class BlogHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="site-header">
        <div class="container">
          <a href="?page=home" class="logo">文章站 - 2d 服社区</a>
          <nav>
            <a href="?page=home">首页</a>
            <a href="https://github.com/2ds-community/2ds.lian.moe" target="_blank">GitHub</a>
            <a href="../" target="_blank">2d 服主页</a>
          </nav>
        </div>
      </header>
    `;
  }
}

// 简单的尾部组件
class BlogFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <p>&copy; ${new Date().getFullYear()} 2d 服社区</p>
        </div>
      </footer>
    `;
  }
}

// 注册组件
customElements.define('blog-header', BlogHeader);
customElements.define('blog-footer', BlogFooter);
/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', () => {
  // 初始化所有组件
  initReveal();
  initSmoothNav();
  initNavScroll();

  // 初始化手风琴
  document.querySelectorAll('.accordion').forEach(initAccordion);

  // Toast 演示按钮
  document.querySelectorAll('[data-toast]').forEach(btn => {
    btn.addEventListener('click', () => {
      ToastManager.show(btn.dataset.toast, btn.dataset.toastEn);
    });
  });

  // 打字机效果
  const typed = document.querySelector('.typed');
  if (typed) {
    const text = typed.dataset.text;
    typed.textContent = '';
    let i = 0;
    const type = () => {
      if (i < text.length) {
        typed.textContent += text[i++];
        setTimeout(type, 80 + Math.random() * 40);
      }
    };
    setTimeout(type, 600);
  }
});

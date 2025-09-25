function createParagraph() {
  const para = document.createElement("pdiv");
  para.textContent = "你点击了按钮！";
  const box1 = document.querySelector(".box-1"); // 找到 class="box-1" 的元素
  box1.appendChild(para);  // 把段落插入到它的末尾

}

const buttons = document.querySelectorAll("button");

for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", createParagraph);
}
const button = document.querySelector("button");

button.addEventListener("click", updateName);

function updateName() {
  const name = prompt("请输入新的名字");
  button.textContent = ` ${name}`;
}
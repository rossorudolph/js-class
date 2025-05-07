let element = document.getElementById("sticky");

document.addEventListener("scroll", function (event) {
  let pos = window.scrollY;
  element.style.fontSize = (16 + pos/100) + "px";
});
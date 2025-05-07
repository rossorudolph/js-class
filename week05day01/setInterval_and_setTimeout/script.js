/*
 * a simple demonstration of how setInterval and setTimeout work.
 *
 * use these functions to make something happen on a delay (setTimeout)
 * or repeatedly on an interval (setInterval)
 *
 * use clearTimeout/clearInterval to cancel.
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/clearTimeout
 *
 */

let boxesAdded = 0;
let content = document.getElementById("content");

function addBox() {
  let newElement = document.createElement("div");
  newElement.classList.add("colorBlock");
  newElement.innerHTML = boxesAdded;
  content.appendChild(newElement);
  boxesAdded++;
}

// adds a box every 2 seconds (2000 milliseconds):
//setInterval(addBox, 2000);

// adds a box once, after 3 seconds:
setTimeout(addBox, 3000);

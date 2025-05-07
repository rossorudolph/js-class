/*
 * adds a new div with a class to the page when a button is pressed
 *
 * see index.html for setting up the onclick attribute.
 *
 */

function addBox() {
	let container = document.getElementById("myContainer");
	let newElement = document.createElement("div");
	newElement.classList.add("pinkBlock");
	container.appendChild(newElement);
}

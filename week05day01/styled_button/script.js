/*
 * sets up the button to have an onclick event handler
 * that reveals an image by changing its display property
 * from none to block.
 *
 * here, the onclick handler is applied to the object using
 * JavaScript, so there's no need to add an attribute in the
 * HTML. this approach can be used for unstyled buttons too.
 */

let button = document.getElementById('revealButton');

button.onclick = function () {
	let nyan = document.getElementById("nyan");
	nyan.style.display = "block";
};

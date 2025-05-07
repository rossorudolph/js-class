/*
 * creates a variable that keeps track of
 * how many times a button has been clicked.
 *
 * see index.html for how this is set up in with an
 * onclick attribute for the button.
 *
 */

let clickCount = 0;

function updateClickCount() {
	clickCount++;
	let element = document.getElementById("clickCount");
	//element.innerHTML = clickCount;
	element.innerHTML = "Button has been pressed " + clickCount + " times!";
}

/*
 * like the previous example, creates a variable that keeps track of
 * how many times a button has been clicked, and uses a conditional
 * to affect what text is on the page, depending on the value in the
 * clickCount variable.
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
	
	if (clickCount === 1){
		element.innerHTML = "Button has been pressed 1 time.";
	} else {
		element.innerHTML = "Button has been pressed " + clickCount + " times!";
	}

	if (clickCount > 10) {
		element.innerHTML += "!!!";
	}
}

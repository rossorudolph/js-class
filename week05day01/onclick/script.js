/*
 * a function that changes the text color of an element
 * using the color given as an argument.
 *
 * see index.html for how this is set up in with an
 * onclick attribute for the buttons.
 *
 */
 
function changeTextColor(color){
	let someText = document.getElementById("someText");
	someText.style.color = color;
}

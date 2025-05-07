/*
 * selects the element with id="hello"
 * adds some text to it, using the innerHTML property.
 *
 */

let element = document.getElementById('hello');
element.innerHTML += " nice to see you!";
console.log(element);
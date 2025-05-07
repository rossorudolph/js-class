/* 
 * select ALL pargraph elements
 * and use a for loop to change their style.
 *
 * document.querySelectorAll allows you to supply
 * any CSS selector as an argument.
 *
 */

let paragraphs = document.querySelectorAll('p'); 

// uncomment this to select by the class helloGoodbye,
// which only affects the first & last divs on the page.
//let paragraphs = document.querySelectorAll('.helloGoodbye');

console.log(paragraphs.length);

for (let p of paragraphs) {
	p.style.background = 'limegreen';
}

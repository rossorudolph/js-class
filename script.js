console.log("Hello World!");

let numClicks = 0;
function updateClickClount() {
numClicks = numClicks + 1;
console.log(numClicks);
}

document.body.addEventListener("click", logClickLocation);
function logClickLocation(eventData) {
console.log( "User clicked at " + eventData.clientX + ", " +
eventData.clientY );
}
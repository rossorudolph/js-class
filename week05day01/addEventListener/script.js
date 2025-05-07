// list is a ul (unordered list) containing a number of li (list items)
let list = document.getElementById("list");

// adding an event listener to the list means we will know if any of the
// contained list items (child elements) have been clicked on
list.addEventListener("click", function (event) {
  
  // which element generated the event?
  let element = event.target;
  
  // it's possible that the UL triggered the event if we clicked between
  // the margins, but we only want the <li> elements to be restyled
  // on click, so we do this check to exclude the <ul>:
  if (element.tagName === "LI") { // use all caps for tag name
    // will add the class if not already present,
    // or remove it if it is.
    element.classList.toggle("selected");
  }
});

// this event listener is ONLY attached to one list item
let puppies = document.getElementById("puppies");
puppies.addEventListener("click", function (event) {
  puppies.classList.toggle("bigText");
});

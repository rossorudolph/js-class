let poem = document.getElementById("poem");

poem.addEventListener("mousemove", (event) => {
  if (event.buttons === 1) {
    // create a text element that contains the word rain
    let rainDrop = document.createElement("p");
    rainDrop.innerHTML = "rain";

    // assign styles present in CSS file
    rainDrop.classList.add("rain");

    // set the element's location (note that the element's
    // position property is set to "absolute" in style.css)
    rainDrop.style.left = event.pageX + "px";
    rainDrop.style.top = event.pageY + "px";

    // add to appropriate div on page
    poem.appendChild(rainDrop);
  }
});


const spaceContainerISS = document.getElementById("craft-iss");
const spaceContainerTian = document.getElementById("craft-tiangong");
const allCrafts = document.querySelectorAll(".craft");

const astrodatas = {"people": [{"craft": "ISS", "name": "Oleg Kononenko"}, {"craft": "ISS", "name": "Nikolai Chub"}, {"craft": "ISS", "name": "Tracy Caldwell Dyson"}, {"craft": "ISS", "name": "Matthew Dominick"}, {"craft": "ISS", "name": "Michael Barratt"}, {"craft": "ISS", "name": "Jeanette Epps"}, {"craft": "ISS", "name": "Alexander Grebenkin"}, {"craft": "ISS", "name": "Butch Wilmore"}, {"craft": "ISS", "name": "Sunita Williams"}, {"craft": "Tiangong", "name": "Li Guangsu"}, {"craft": "Tiangong", "name": "Li Cong"}, {"craft": "Tiangong", "name": "Ye Guangfu"}], "number": 12, "message": "success"};


function checkForAstronauts(button) {
    button.style.display = "none"; // hide button

    fetch('http://api.open-notify.org/astros.json') // get astronaut data
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(data); 

            // Update the Message
            document.getElementById("status").innerHTML = `Whoa there are ${data.number} people in space rn!!`;

            // Add each Astronaut to their craft
            var astros = data.people;
            astros.forEach(astro => {
                AddAstro(astro);
            });
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
        });
}

function AddAstro(astro) {
    let div = document.createElement("div");
    div.classList.add("astro");
    div.innerHTML = astro.name;
    if (astro.craft == "ISS") {
        spaceContainerISS.appendChild(div);
    } else if (astro.craft == "Tiangong") {
        spaceContainerTian.appendChild(div);
    }
} 
			
const buttonStart = document.getElementById("start-button");

function startTone() {
    buttonStart.disabled = "true";
	Tone.start().then(() => { 
        console.log("audio is ready"); 
        buttonStart.style.display = "none";
        startSequence();
    }).catch((error) => { 
        console.log("audio not ready"); 
        buttonStart.disabled = "false"; 
    });
}

const synth = new Tone.PolySynth().toDestination();

// Setup grid Data
const rows = [
    new Tone.Player("https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3").toDestination(), // Kick drum
    new Tone.Player("https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3").toDestination(), // Snare drum
    new Tone.Player("drumulator-hi-hat.wav").toDestination(), // Hi-hat
];
const cols = 8; // Number of columns
const grid = [];
for (let i = 0; i < rows.length; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
        row.push(false); // Example: Fill with numbers
    }
    grid.push(row);
}
console.log(grid);

let index = 0;

// Sequence based on grid data
const sequence = new Tone.Sequence((time, col) => {
  rows.forEach((player, rowIndex) => {
    if (grid[rowIndex][col]) {
      // IF USING SAMPLES:
      player.start(time);
    }
  });
    // Highlight the current column
    highlightColumn(col);
}, Array.from({ length: cols }, (_, i) => i), "8n");

function startSequence() {
    sequence.start(1);
    Tone.Transport.start();
}

// Create UI squares
const container = document.getElementById("content");
const cells = []; // Store references to cell elements for easy access
grid.forEach((row, rowIndex) => {
  const rowCells = [];
  row.forEach((col, colIndex) => {
    const square = document.createElement("div");
    square.classList.add("cell");
    square.addEventListener("click", () => {
      grid[rowIndex][colIndex] = !grid[rowIndex][colIndex];
      if (grid[rowIndex][colIndex]) {
        square.classList.add("active");
      } else {
        square.classList.remove("active");
      }
    });
    container.appendChild(square);
    rowCells.push(square);
  });
  cells.push(rowCells);
});

// Highlight the active column
function highlightColumn(col) {
    console.log(col);
    // Clear previous highlights
    cells.forEach((row) => {
        row.forEach((cell) => {
            cell.classList.remove("highlight");
        });
    });
    console.log(cells);
    // Highlight the current column
    cells.forEach((row) => { // Go through each row
        row[col].classList.add("highlight"); // Only highlight the cell in the target column
    });
}

document.body.appendChild(container);

// Initialize DOM elements
const buttonStart = document.getElementById("start-button");
const playButton = document.getElementById("play-button");
const stopButton = document.getElementById("stop-button");
const clearButton = document.getElementById("clear-button");
const pad = document.getElementById('xy-pad');
const dot = document.getElementById('dot');
const sequencerEl = document.getElementById('sequencer');

// Parameter display elements
const vibratoDepthEl = document.getElementById('vibrato-depth');
const vibratoFreqEl = document.getElementById('vibrato-freq');
const lfoFreqEl = document.getElementById('lfo-freq');
const lfoDepthEl = document.getElementById('lfo-depth');

// Sequencer configuration
const sequencerNotes = ["A3", "G3", "E3", "D3", "C3", "Bass"];
const numberOfRows = sequencerNotes.length;
const numberOfSteps = 8;
let currentStep = 0;

// Will store our pattern data - initialized in createSequencerUI
let sequencerPattern = [];

// Audio objects
let synth, synthBass, vibrato, volumeGain, volumeLFO, sequence, loop;

// Create sequencer visualization
function createSequencerUI() {
  // Clear existing elements
  sequencerEl.innerHTML = '';
  
  // Initialize the pattern data structure
  sequencerPattern = [];
  for (let i = 0; i < numberOfRows; i++) {
    sequencerPattern[i] = Array(numberOfSteps).fill(false);
  }
  
  // Create rows for each note
  for (let i = 0; i < numberOfRows; i++) {
    const noteRow = document.createElement('div');
    noteRow.className = 'note-row';
    
    // Create steps for each position in the sequence
    for (let j = 0; j < numberOfSteps; j++) {
      const step = document.createElement('div');
      step.className = 'step';
      step.dataset.row = i;
      step.dataset.col = j;
      step.dataset.note = sequencerNotes[i];
      
      // Add click event to toggle step active state
      step.addEventListener('click', () => {
        // Toggle active state in data structure
        sequencerPattern[i][j] = !sequencerPattern[i][j];
        // Toggle visual active state
        step.classList.toggle('active');
        
        // Update the sequence if audio is initialized
        if (synth) {
          updateSequenceFromPattern();
        }
      });
      
      noteRow.appendChild(step);
    }
    
    sequencerEl.appendChild(noteRow);
  }
  
  // Add some default pattern (C major chord arpeggio + bass on beats 1 and 5)
  // This helps users understand how it works
  
  // C3 on step 0
  toggleStep(4, 0);
  // E3 on step 2
  toggleStep(2, 2);
  // G3 on step 4
  toggleStep(1, 4);
  // C3 on step 6
  toggleStep(4, 6);
  
  // Bass on steps 0 and 4
  toggleStep(5, 0);
  toggleStep(5, 4);
}

// Helper function to toggle a step programmatically
function toggleStep(row, col) {
  sequencerPattern[row][col] = true;
  const step = document.querySelector(`.step[data-row="${row}"][data-col="${col}"]`);
  if (step) step.classList.add('active');
}

// Updates the Tone.js sequence based on the current pattern
function updateSequenceFromPattern() {
  // Collect notes for main synthesizer
  let melodySequence = Array(numberOfSteps).fill(null);
  
  // Go through each step
  for (let j = 0; j < numberOfSteps; j++) {
    // Check each row (except the last row which is for bass)
    for (let i = 0; i < numberOfRows - 1; i++) {
      if (sequencerPattern[i][j]) {
        // If this step is active, add the note
        melodySequence[j] = sequencerNotes[i];
        break; // Only use the highest note if multiple are selected
      }
    }
  }
  
  // Create a new array for bass triggers
  let bassSteps = [];
  for (let j = 0; j < numberOfSteps; j++) {
    if (sequencerPattern[numberOfRows - 1][j]) {
      bassSteps.push(j);
    }
  }
  
  // Cancel any existing sequences
  if (sequence) sequence.dispose();
  if (loop) loop.dispose();
  
  // Create new melodic sequence
  sequence = new Tone.Sequence((time, note) => {
    if (note !== null) {
      synth.triggerAttackRelease(note, "8n", time);
    }
    
    // Update sequencer visualization on each step
    Tone.Draw.schedule(() => {
      updateSequencerUI(currentStep);
      currentStep = (currentStep + 1) % numberOfSteps;
    }, time);
  }, melodySequence, "8n");
  
  // Create new bass loop that triggers only on specified steps
  loop = new Tone.Loop((time) => {
    const loopStep = Math.floor(Tone.Transport.position.split(':')[1] * 2) % numberOfSteps;
    if (bassSteps.includes(loopStep)) {
      synthBass.triggerAttackRelease("C2", "16n", time);
    }
  }, "8n");
  
  // Start the sequences (but don't start Transport yet)
  sequence.start(0);
  loop.start(0);
}

// Update sequencer UI to show current step
function updateSequencerUI(step) {
  // Remove 'current' class from all steps
  const allSteps = document.querySelectorAll('.step');
  allSteps.forEach(el => el.classList.remove('current'));
  
  // Add 'current' class to current step in each row
  for (let i = 0; i < numberOfRows; i++) {
    const currentStepEl = document.querySelector(`.step[data-row="${i}"][data-col="${step}"]`);
    if (currentStepEl) {
      currentStepEl.classList.add('current');
    }
  }
}

// Start audio context
buttonStart.addEventListener('click', function() {
  buttonStart.disabled = true;
  
  Tone.start().then(() => { 
    console.log("audio is ready"); 
    buttonStart.style.display = "none";
    
    // Enable controls
    playButton.disabled = false;
    stopButton.disabled = false;
    clearButton.disabled = false;
    
    // Setup audio system
    setupAudio();
    
    // Create the sequencer UI
    createSequencerUI();
    
    // Initialize the audio sequence from the pattern
    updateSequenceFromPattern();
    
  }).catch((error) => { 
    console.log("audio not ready", error); 
    buttonStart.disabled = false; 
  });
});

// Audio setup function
function setupAudio() {
  // Create a cello-like synth
  synth = new Tone.FMSynth({
    harmonicity: 3.01,
    modulationIndex: 14,
    oscillator: {
      type: "sine"
    },
    envelope: {
      attack: 0.2,
      decay: 0.3,
      sustain: 0.9,
      release: 1.2
    },
    modulation: {
      type: "square"
    },
    modulationEnvelope: {
      attack: 0.5,
      decay: 0.1,
      sustain: 0.5,
      release: 0.5
    }
  });
  
  // Create bass synth
  synthBass = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 4,
    oscillator: {
      type: "sine"
    },
    envelope: {
      attack: 0.001,
      decay: 0.4,
      sustain: 0.01,
      release: 1.4,
      attackCurve: "exponential"
    }
  });
  
  // Create effects
  vibrato = new Tone.Vibrato({
    frequency: 5,
    depth: 0.1,
    type: "sine"
  });
  
  // Add a gain node to control volume
  volumeGain = new Tone.Gain(0.7);
  
  // Create an LFO to control the volume
  volumeLFO = new Tone.LFO({
    type: "square",
    frequency: 1, // Slow oscillation
    min: 0,       // Fully silent
    max: 1,       // Full volume
    amplitude: 1  // Full-range modulation
  }).start();
  
  // Connect the LFO to the gain's volume
  volumeLFO.connect(volumeGain.gain);
  
  // Add a filter for more warmth
  const filter = new Tone.Filter({
    type: "lowpass",
    frequency: 2000,
    Q: 1
  });
  
  // Add reverb for ambience
  const reverb = new Tone.Reverb({
    decay: 2,
    wet: 0.3
  }).toDestination();
  
  // Chain the effects for the cello synth
  synth.chain(vibrato, filter, volumeGain, reverb);
  
  // Chain the effects for the bass
  synthBass.chain(volumeGain, reverb);
  
  // Set up play/stop buttons
  playButton.addEventListener('click', () => {
    Tone.Transport.start();
  });
  
  stopButton.addEventListener('click', () => {
    Tone.Transport.stop();
    // Clear current step indicators
    const allSteps = document.querySelectorAll('.step');
    allSteps.forEach(el => el.classList.remove('current'));
    currentStep = 0;
  });
  
  // Clear button to reset pattern
  clearButton.addEventListener('click', () => {
    // Stop transport if playing
    Tone.Transport.stop();
    
    // Clear all active steps
    const activeSteps = document.querySelectorAll('.step.active');
    activeSteps.forEach(step => {
      step.classList.remove('active');
      const row = parseInt(step.dataset.row);
      const col = parseInt(step.dataset.col);
      sequencerPattern[row][col] = false;
    });
    
    // Clear current step indicators
    const currentSteps = document.querySelectorAll('.step.current');
    currentSteps.forEach(step => step.classList.remove('current'));
    
    currentStep = 0;
    
    // Update sequence
    updateSequenceFromPattern();
  });
  
  // Set up XY pad functionality
  setupXYPad();
}

// Map values between a range
function map(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Setup XY pad controls
function setupXYPad() {
  // Handle mouse movement on XY pad
  pad.addEventListener('mousemove', (e) => {
    if (!pad.active && !pad.matches(':active')) return;
    
    const rect = pad.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    
    // Update dot position
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    
    // Map X position to vibrato parameters
    const vibratoDepth = map(x, 0, rect.width, 0, 0.5);
    const vibratoFrequency = map(x, 0, rect.width, 0.1, 8);
    vibrato.depth.value = vibratoDepth;
    vibrato.frequency.value = vibratoFrequency;
    
    // Map Y position to LFO parameters
    const lfoFrequency = map(y, 0, rect.height, 0.1, 15);
    volumeLFO.frequency.value = lfoFrequency;
    
    const lfoDepth = map(y, 0, rect.height, 0, 1);
    volumeLFO.amplitude.value = lfoDepth;
    
    // Update parameter display
    vibratoDepthEl.textContent = vibratoDepth.toFixed(2);
    vibratoFreqEl.textContent = vibratoFrequency.toFixed(2) + ' Hz';
    lfoFreqEl.textContent = lfoFrequency.toFixed(2) + ' Hz';
    lfoDepthEl.textContent = lfoDepth.toFixed(2);
  });
  
  // Handle mouse down event
  pad.addEventListener('mousedown', (e) => {
    pad.active = true;
    
    // Trigger the mousemove event to update parameters immediately
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: e.clientX,
      clientY: e.clientY
    });
    pad.dispatchEvent(mouseEvent);
    
    // Add active class to dot
    dot.classList.add("active");
  });
  
  // Handle mouse up and mouse leave events
  pad.addEventListener('mouseup', () => {
    pad.active = false;
    dot.classList.remove("active");
  });
  
  pad.addEventListener('mouseleave', () => {
    if (pad.active) {
      pad.active = false;
      dot.classList.remove("active");
    }
  });
}
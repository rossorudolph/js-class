// 1. Get DOM elements
const startButton = document.getElementById('start-button');
const playButton = document.getElementById('play-button');
const stopButton = document.getElementById('stop-button');
const noteButtons = document.querySelectorAll('.note-button');

// Effect controls
const distortionSlider = document.getElementById('distortion');
const reverbSlider = document.getElementById('reverb');
const distortionValue = document.getElementById('distortion-value');
const reverbValue = document.getElementById('reverb-value');

// 2. Initialize variables
let synth;
let distortion;
let reverb;
let sequence;

// 3. Start audio context when button is clicked
startButton.addEventListener('click', async () => {
  // This line is needed to start audio in browsers
  await Tone.start();
  console.log('Audio is ready');
  startButton.disabled = true;
  
  // 4. CREATE OUR INSTRUMENTS AND EFFECTS
  
  // Create a basic synth
  synth = new Tone.Synth({
    oscillator: {
      type: "triangle"  // Basic waveform
    },
    envelope: {
      attack: 0.05,
      decay: 0.2,
      sustain: 0.2,
      release: 1
    }
  });

//   var instrument = new Tone.MembraneSynth();
// var synthJSON = {
// 	"pitchDecay"  : 0.15 ,
// 	"octaves"  : 8 ,
// 	"oscillator"  : {
// 		"type"  : "sine"
// }  ,
// 	"envelope"  : {
// 		"attack"  : 0.001 ,
// 		"decay"  : 0.5 ,
// 		"sustain"  : 0.01 ,
// 		"release"  : 1.4 ,
// 		"attackCurve"  : "exponential"
// 	}
// }
// ;        INSTEAD OF THIS DID THE BELOW
  
synth = new Tone.MembraneSynth({
    pitchDecay: 0.15,
    octaves: 8,
    oscillator: {
      type: "sine"
    },
    envelope: {
      attack: 0.001,
      decay: 0.5,
      sustain: 0.01,
      release: 1.4,
      attackCurve: "exponential"
    }
  });

  // Create effects
  distortion = new Tone.Distortion(0.2);  // Initial distortion amount
  reverb = new Tone.JCReverb(0.3);        // Initial reverb amount
  
  // 5. CONNECT THE AUDIO CHAIN
  // This is the key part that shows how effects are applied:
  // synth -> distortion -> reverb -> speakers
  synth.connect(distortion);      // Connect synth to distortion
  distortion.connect(reverb);     // Connect distortion to reverb
  reverb.toDestination();         // Connect reverb to speakers
  
  // Create a simple sequence
  sequence = new Tone.Sequence((time, note) => {
    synth.triggerAttackRelease(note, "8n", time);
  }, ["C4", "E4", "G4", "B4"], "4n");
  
  // Enable all controls
  enableControls();
});

// 6. Enable controls after audio is started
function enableControls() {
  // Enable note buttons
  noteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const note = button.dataset.note;
      synth.triggerAttackRelease(note, "8n");
    });
  });
  
  // Enable sequencer controls
  playButton.addEventListener('click', () => {
    Tone.Transport.start();
    sequence.start();
  });
  
  stopButton.addEventListener('click', () => {
    Tone.Transport.stop();
    sequence.stop();
  });
  
  // 7. CONNECT EFFECT SLIDERS
  // When sliders change, update effect values
  distortionSlider.addEventListener('input', () => {
    const value = parseFloat(distortionSlider.value);
    // This line directly changes the effect parameter
    distortion.distortion = value;
    distortionValue.textContent = value.toFixed(1);
  });
  
  reverbSlider.addEventListener('input', () => {
    const value = parseFloat(reverbSlider.value);
    // This line directly changes the effect parameter
    reverb.roomSize.value = value;
    reverbValue.textContent = value.toFixed(1);
  });
}
			
const buttonStart = document.getElementById("start-button");

function startTone() {
    buttonStart.disabled = "true";
	Tone.start().then(() => { 
        console.log("audio is ready"); 
        buttonStart.style.display = "none";
        Tone.Transport.start();
    }).catch((error) => { 
        console.log("audio not ready"); 
        buttonStart.disabled = "false"; 
    });
}

const synth = new Tone.Synth({
    oscillator: {
        type: "amtriangle",
        harmonicity: 0.5,
        modulationType: "sine",
    },
    envelope: {
        attackCurve: "exponential",
        attack: 0.05,
        decay: 0.2,
        sustain: 0.2,
        release: 1.5,
    },
    portamento: 0.05,
});
//.toDestination();

// For parallel processing (if that's what you want)
const reverb = new Tone.JCReverb(0.8);
const distort = new Tone.Distortion(0.8);

// Create a merger to combine both effect outputs
const merger = new Tone.Gain();

// Route synth through both effects in parallel
synth.connect(reverb);
synth.connect(distort);

// Connect both effects to the merger
reverb.connect(merger);
distort.connect(merger);

// Send the combined signal to output
merger.toDestination();


const sequence = new Tone.Sequence((time, note) => {
    synth.triggerAttackRelease(note, 0.1, time);
    // subdivisions are given as subarrays
}, ["C4", ["E4", "D4", "E4"], "G4", ["A4", "G4"]])
sequence.start(0);


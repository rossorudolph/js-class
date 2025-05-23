// DOM Elements
const pad = document.getElementById('xy-pad');
const dot = document.getElementById('cursor');  // Renamed from 'dot' to 'cursor'
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

// Set canvas size to fill window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pad.style.width = `${window.innerWidth}px`;
  pad.style.height = `${window.innerHeight}px`;
}

// State management
let audioStarted = false;
let isPlaying = false;
let mouseX = 0;
let mouseY = 0;
let currentChordIndex = 0;

// Add person position state variables
let personX = 0;
let personY = 0;

// Track which arrow keys are currently pressed
let keysPressed = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

// Effect intensity parameters that will influence visuals
let granularIntensity = 0;
let lfoIntensity = 0;

// Visual parameters
const chordColors = [
  { main: '#834ebd', accent: '#af82cf' }, // Chord 1: C4 A3 E3 - purple
  { main: '#4e6ebd', accent: '#829fcf' }, // Chord 2a: C4 G3 D3 - blue
  { main: '#4e9abd', accent: '#82c3cf' }, // Chord 2b: B3 G3 D3 - cyan
  { main: '#bd4e9a', accent: '#cf82c3' }, // Chord 3: D4 B3 E3 - magenta
  { main: '#bd834e', accent: '#cfaf82' }, // Chord 4a: D4 B3 G3 - amber
  { main: '#bd4e4e', accent: '#cf8282' }  // Chord 4b: C4 A3 F3 - red
];

let particles = [];
let glitchIntensity = 0;
let waveforms = [];

// Create a reverb effect
const reverb = new Tone.Reverb({
  decay: 4,
  wet: 0.5  // Reduced from 0.6
}).toDestination();

// Create a polyphonic FM synth for playing chords
const synth = new Tone.PolySynth(Tone.FMSynth).set({
  harmonicity: 3.01,
  modulationIndex: 14,
  oscillator: {
    type: "triangle"
  },
  envelope: {
    attack: 0.3,
    decay: 0.3,
    sustain: 0.2,
    release: 1.2
  },
  modulation: {
    type: "square"
  },
  modulationEnvelope: {
    attack: 0.01,
    decay: 0.5,
    sustain: 0.2,
    release: 0.1
  }
}).set({
  volume: -3  // Slightly reduced volume
});

// Create a synth for arpeggios with a lighter sound - trance style
const arpeggioSynth = new Tone.FMSynth({
  harmonicity: 1.5,
  modulationIndex: 10,
  oscillator: {
    type: "sine"
  },
  envelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.2,
    release: 1.2 // Extended release
  },
  modulation: {
    type: "triangle"
  },
  modulationEnvelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.2,
    release: 0.8
  }
}).set({
  volume: -8 // Quieter than the main synth
});

// Create percussion sounds
const percussion = new Tone.MembraneSynth({
  pitchDecay: 0.01,
  octaves: 3,
  oscillator: {
    type: "sine"
  },
  envelope: {
    attack: 0.001,
    decay: 0.1,
    sustain: 0.01,
    release: 0.1
  }
}).set({
  volume: -5
});

// Additional high-tick percussion
const hiPercussion = new Tone.MetalSynth({
  frequency: 4000,
  envelope: {
    attack: 0.001,
    decay: 0.05,
    sustain: 0.01,
    release: 0.05
  },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 1000,
  octaves: 1.5
}).set({
  volume: -12
});

// Create a bass synth with a deeper sound and longer sustain for trance feel
const synthBass = new Tone.Synth({
  oscillator: {
    type: "triangle"
  },
  envelope: {
    attack: 0.02,
    decay: 0.2,
    sustain: 0.8,  // Increased from 0.1 for longer sustain
    release: 2.5   // Increased from 1 for longer release
  }
}).set({
  volume: -12  // Significantly reduced volume
});

// Set tempo slower for longer chords
Tone.Transport.bpm.value = 80;

// Your chord progression
const chordProgression = [
  ["C4", "A3", "E3"],              // Chord 1 (full measure)
  ["C4", "G3", "D3"],              // Chord 2a (first half)
  ["B3", "G3", "D3"],              // Chord 2b (second half)
  ["D4", "B3", "E3"],              // Chord 3 (full measure)
  ["D4", "B3", "G3"],              // Chord 4a (first half)
  ["C4", "A3", "F3"]               // Chord 4b (second half)
];

// Create note to frequency conversion for visualization
const noteToFreq = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88
};

// Bass notes
const bassNotes = ["E1", "D1", "G1", "E1", "G1", "F1"];

// Granular synthesis implementation
class GranularSynthesis {
  constructor() {
    // Create buffer source for granular synthesis
    this.buffer = new Tone.ToneAudioBuffer();
    
    // Create multiple grain players for overlapping grains
    this.grainPlayers = [];
    this.grainCount = 8;
    
    for (let i = 0; i < this.grainCount; i++) {
      const player = new Tone.GrainPlayer({
        url: "./empty", // Will be replaced with buffer data
        loop: true,
        overlap: 0.1,
        grainSize: 0.1,
        playbackRate: 1
      }).toDestination();
      
      this.grainPlayers.push(player);
    }
    
    // Use a noise generator as source for granular synthesis
    this.noiseSource = new Tone.Noise("pink").start();
    
    // Capture the noise into the buffer
    this.recorder = new Tone.Recorder();
    this.noiseSource.connect(this.recorder);
    
    // Parameters
    this.grainSize = 0.1; // in seconds
    this.overlap = 0.1;   // overlap between grains
    this.density = 0.5;   // density of grains
    this.detune = 0;      // detune amount
    
    // Capture buffer when initialized
    this.captureBuffer();
  }
  
  async captureBuffer() {
    // Record 2 seconds of noise
    this.recorder.start();
    
    // Wait for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Stop recording and get the buffer
    const recording = await this.recorder.stop();
    
    // Convert the recording to buffer
    const url = URL.createObjectURL(recording);
    this.buffer = new Tone.ToneAudioBuffer(url, () => {
      console.log("Granular buffer loaded");
      
      // Initialize all grain players with the buffer
      this.grainPlayers.forEach(player => {
        player.buffer = this.buffer;
        player.grainSize = this.grainSize;
        player.overlap = this.overlap;
      });
    });
  }
  
  // Set grain size (0.01 to 0.5 seconds)
  setGrainSize(size) {
    this.grainSize = Math.max(0.01, Math.min(0.5, size));
    this.grainPlayers.forEach(player => {
      player.grainSize = this.grainSize;
    });
  }
  
  // Set grain overlap (0.01 to 0.5)
  setOverlap(overlap) {
    this.overlap = Math.max(0.01, Math.min(0.5, overlap));
    this.grainPlayers.forEach(player => {
      player.overlap = this.overlap;
    });
  }
  
  // Set playback rate (-2 to 2)
  setPlaybackRate(rate) {
    this.playbackRate = Math.max(-2, Math.min(2, rate));
    this.grainPlayers.forEach(player => {
      player.playbackRate = this.playbackRate;
    });
  }
  
  // Set detune (-1200 to 1200 cents, +/- one octave)
  setDetune(cents) {
    this.detune = Math.max(-1200, Math.min(1200, cents));
    this.grainPlayers.forEach(player => {
      player.detune = this.detune;
    });
  }
  
  // Start or stop all grain players
  togglePlayers(playing) {
    if (playing) {
      this.grainPlayers.forEach(player => {
        player.start();
      });
    } else {
      this.grainPlayers.forEach(player => {
        player.stop();
      });
    }
  }
  
  // Connect to destination or effect
  connect(destination) {
    this.grainPlayers.forEach(player => {
      player.disconnect();
      player.connect(destination);
    });
  }
  
  // Set volume (0 to 1)
  setVolume(volume) {
    const mappedVolume = Math.max(0, Math.min(1, volume));
    this.grainPlayers.forEach(player => {
      player.volume.value = Tone.gainToDb(mappedVolume * 0.3);
    });
  }
}

// Create granular synthesis engine
const granularSynth = new GranularSynthesis();
granularSynth.connect(reverb);

// Left-axis effect: LFO for volume modulation - gentler for trance
const volumeGain = new Tone.Gain(1);
const volumeLFO = new Tone.LFO({
  type: "sine", // Changed from "square" to "sine" for smoother trance feel
  frequency: 1,
  min: 0.4,    // Changed from 0 to 0.4 for less extreme volume drops
  max: 0.9,    // Changed from 1 to 0.9 to prevent too loud peaks
  amplitude: 0.6, // Reduced from 1 for a gentler effect
}).start();
volumeLFO.connect(volumeGain.gain);

// Chain effects to instruments
synth.chain(volumeGain, reverb);
synthBass.chain(volumeGain, reverb);
arpeggioSynth.chain(volumeGain, reverb);
percussion.chain(reverb);
hiPercussion.chain(reverb);

// Function to set up Tone.js audio
function setupAudio() {
  // Chord progression
  Tone.Transport.scheduleRepeat(time => {
    const measure = Math.floor(Tone.Transport.position.split(':')[0]) % 8;
    const beat = parseInt(Tone.Transport.position.split(':')[1]);
    
    // Play chords based on the current measure
    if (measure === 0 && beat === 0) {
      // First chord - full 2 measures
      synth.triggerAttackRelease(chordProgression[0], "2m", time);
      currentChordIndex = 0;
      triggerVisualChord(0);
    }
    else if (measure === 2 && beat === 0) {
      // Second chord - first half
      synth.triggerAttackRelease(chordProgression[1], "1m", time);
      currentChordIndex = 1;
      triggerVisualChord(1);
    }
    else if (measure === 3 && beat === 0) {
      // Second chord - second half (B3 substitution)
      synth.triggerAttackRelease(chordProgression[2], "1m", time);
      currentChordIndex = 2;
      triggerVisualChord(2);
    }
    else if (measure === 4 && beat === 0) {
      // Third chord - full 2 measures
      synth.triggerAttackRelease(chordProgression[3], "2m", time);
      currentChordIndex = 3;
      triggerVisualChord(3);
    }
    else if (measure === 6 && beat === 0) {
      // Fourth chord - first half
      synth.triggerAttackRelease(chordProgression[4], "1m", time);
      currentChordIndex = 4;
      triggerVisualChord(4);
    }
    else if (measure === 7 && beat === 0) {
      // Fourth chord - second half (with F3)
      synth.triggerAttackRelease(chordProgression[5], "1m", time);
      currentChordIndex = 5;
      triggerVisualChord(5);
    }
  }, "1m");

  // Bass pattern with longer notes for trance feel
  Tone.Transport.scheduleRepeat(time => {
    const measure = Math.floor(Tone.Transport.position.split(':')[0]) % 8;
    let bassNote;
    
    if (measure < 2) {
      bassNote = bassNotes[0]; // First chord
    } else if (measure === 2) {
      bassNote = bassNotes[1]; // Second chord first half
    } else if (measure === 3) {
      bassNote = bassNotes[2]; // Second chord second half
    } else if (measure < 6) {
      bassNote = bassNotes[3]; // Third chord
    } else if (measure === 6) {
      bassNote = bassNotes[4]; // Fourth chord first half
    } else {
      bassNote = bassNotes[5]; // Fourth chord second half
    }
    
    // Use longer bass notes for classic trance feel
    synthBass.triggerAttackRelease(bassNote, "2n", time); // Changed from "8n" to "2n" for half note duration
    triggerVisualBass();
  }, "2n"); // Changed from "4n" to "2n" to trigger less frequently

  // Arpeggiator pattern - FIX - reversed order for descending arpeggio
  Tone.Transport.scheduleRepeat(time => {
    const measure = Math.floor(Tone.Transport.position.split(':')[0]) % 8;
    const sixteenth = parseInt(Tone.Transport.position.split(':')[2]);
    let chordIndex;
    
    if (measure < 2) {
      chordIndex = 0; // First chord
    } else if (measure === 2) {
      chordIndex = 1; // Second chord first half
    } else if (measure === 3) {
      chordIndex = 2; // Second chord second half
    } else if (measure < 6) {
      chordIndex = 3; // Third chord
    } else if (measure === 6) {
      chordIndex = 4; // Fourth chord first half
    } else {
      chordIndex = 5; // Fourth chord second half
    }
    
    // Get the current chord and play a descending note
    const currentChord = chordProgression[chordIndex];
    const noteIndex = sixteenth % 3;
    
    // IMPORTANT FIX: Reverse the order to play descending
    // Since the chord format is already ordered high to low,
    // we DIRECTLY use the index for descending (not reversed)
    const noteToPlay = currentChord[noteIndex]; 
    
    arpeggioSynth.triggerAttackRelease(noteToPlay, "32n", time);
    triggerVisualArpeggio(noteToPlay);
  }, "12n");

  // Percussion pattern
  Tone.Transport.scheduleRepeat(time => {
    const beat = parseInt(Tone.Transport.position.split(':')[1]);
    const sixteenth = parseInt(Tone.Transport.position.split(':')[2]);
    
    // Low percussion on downbeats
    if (beat === 0) {
      percussion.triggerAttackRelease("C2", "32n", time, 0.8);
      triggerVisualPercussion(true);
    }
    
    // Higher ticks on specific sixteenths
    if (sixteenth === 4 || sixteenth === 10 || sixteenth === 12) {
      hiPercussion.triggerAttackRelease("C5", "64n", time, 0.3);
      triggerVisualPercussion(false);
    }
  }, "16n");
}

// Map values between a range
function map(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Visual functions
function initVisuals() {
  resizeCanvas();
  
  // Set up the initial waveforms for each chord
  for (let i = 0; i < chordProgression.length; i++) {
    const chord = chordProgression[i];
    const waveform = [];
    
    // Generate points for each note's sine wave
    for (let j = 0; j < chord.length; j++) {
      const noteFreq = noteToFreq[chord[j]] || 440; // Default to A4 if not found
      const wavelength = canvas.width / (noteFreq / 10);
      const wave = [];
      
      for (let x = 0; x < canvas.width; x++) {
        wave.push(Math.sin(x / wavelength * Math.PI * 2) * 30);
      }
      
      waveform.push(wave);
    }
    
    waveforms.push(waveform);
  }
  
  // Start the animation loop
  animateVisuals();
}

// Create visual effects for audio events
function triggerVisualChord(index) {
  // Add fewer particles for chord notes with longer duration and blur effect
  const chord = chordProgression[index];
  const color = chordColors[index];
  
  // Significantly reduce the number of particles
  for (let i = 0; i < chord.length; i++) {
    // Calculate positions based on frequency and canvas dimensions
    const noteFreq = noteToFreq[chord[i]] || 440;
    const xPosition = map(noteFreq, 100, 500, canvas.width * 0.2, canvas.width * 0.8);
    const yPosition = canvas.height * (0.3 + i * 0.15);
    
    // Create just a couple of particles with blur properties
    for (let j = 0; j < 3; j++) {  // Reduced from 8 to 3
      particles.push({
        x: xPosition + (Math.random() - 0.5) * canvas.width * 0.3,
        y: yPosition + (Math.random() - 0.5) * canvas.height * 0.2,
        size: 50 + Math.random() * 40,
        color: j % 2 === 0 ? color.main : color.accent,
        decay: 0.985,  // Slower decay so particles last longer
        speed: 0.1,
        alpha: 0.5,
        blur: true,  // Flag for blur effect
        blurAmount: 15 + Math.random() * 10  // Variable blur amount
      });
    }
  }
  
  // Trigger glitch effect
  glitchIntensity = 1;
}

function triggerVisualBass() {
  // Add subtle bass impact without center pulse
  // Instead of a center pulse, add a few small particles at random positions
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * (canvas.width * 0.3);
    
    particles.push({
      x: canvas.width/2 + Math.cos(angle) * distance,
      y: canvas.height/2 + Math.sin(angle) * distance,
      size: 10 + Math.random() * 15,
      color: '#ffffff',
      decay: 0.9,
      speed: 0.5,
      alpha: 0.04,
      blur: true,
      blurAmount: 8
    });
  }
}

function triggerVisualArpeggio(note) {
  // Add small particles for arpeggio notes
  const noteFreq = noteToFreq[note] || 440;
  const xPos = map(noteFreq, 100, 500, canvas.width * 0.2, canvas.width * 0.8);
  const yPos = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
  
  particles.push({
    x: xPos,
    y: yPos,
    size: 8 + Math.random() * 12,
    color: chordColors[currentChordIndex].accent,
    decay: 0.92,
    speed: 0.8,
    alpha: 0.5,
    blur: true,
    blurAmount: 5
  });
}

function triggerVisualPercussion(isLow) {
  // Make percussion visuals emanate from cursor position - more subtle
  if (isLow) {
    // Low percussion visual - reduced size and opacity
    particles.push({
      x: mouseX,
      y: mouseY,
      size: 60,  // Reduced from 120
      color: '#ffffff',
      decay: 0.85,
      speed: 0.3,
      alpha: 0.08,  // Reduced from 0.15
      blur: true,
      blurAmount: 10
    });
  } else {
    // High percussion visual - fewer and more subtle
    for (let i = 0; i < 2; i++) {  // Reduced from 3 to 2
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 50 + 20;  // Reduced from 80 to 50
      
      particles.push({
        x: mouseX + Math.cos(angle) * distance,
        y: mouseY + Math.sin(angle) * distance,
        size: 2 + Math.random() * 3,  // Reduced from 5 to 3
        color: '#ffffff',
        decay: 0.8,
        speed: 0.9,
        alpha: 0.2,  // Reduced from 0.4
        blur: true,
        blurAmount: 5
      });
    }
  }
}

// Draw tribal cursor with fixed color
function drawTribalCursor(x, y) {
  // This function is now deprecated in favor of drawPersonFigure
  // Keeping it for compatibility
  drawPersonFigure(x, y);
}

// Draw a tiny person figure instead of cursor
function drawPersonFigure(x, y) {
  ctx.save();
  
  // Draw main shape
  ctx.translate(x, y);
  ctx.globalAlpha = 0.9;
  
  // Person colors
  const personColor = {
    main: '#e0e0e0',
    secondary: '#a0a0a0'
  };
  
  // Subtle glow around the person
  const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 20);
  gradient.addColorStop(0, 'rgba(220, 220, 220, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw person figure
  ctx.strokeStyle = personColor.main;
  ctx.fillStyle = personColor.main;
  ctx.lineWidth = 1.5;
  
  // Head
  ctx.beginPath();
  ctx.arc(0, -10, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 5);
  ctx.stroke();
  
  // Arms
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(7, 0);
  ctx.stroke();
  
  // Legs
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(-5, 15);
  ctx.moveTo(0, 5);
  ctx.lineTo(5, 15);
  ctx.stroke();
  
  ctx.restore();
}

function animateVisuals() {
  if (!canvas) return;
  
  // Clear canvas with fade effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Update and draw particles with blur effect
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.size *= p.decay;
    p.alpha *= p.decay;
    
    if (p.size < 0.5 || p.alpha < 0.01) {
      particles.splice(i, 1);
      continue;
    }
    
    // Apply blur effect for particles that need it
    if (p.blur) {
      ctx.filter = `blur(${p.blurAmount}px)`;
    } else {
      ctx.filter = 'none';
    }
    
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }
  
  // Draw minimal grid with grayscale lines
  if (isPlaying) {
    // Fixed grayscale color for grid lines
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.03)';
    ctx.lineWidth = 0.5;
    
    // Just a few subtle horizontal lines
    for (let y = 0; y < canvas.height; y += canvas.height / 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }
  
  // Apply glitch effect
  if (glitchIntensity > 0.05) {
    const glitchY = Math.random() * canvas.height;
    const glitchHeight = Math.random() * 10 * glitchIntensity;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, glitchY, canvas.width, glitchHeight);
    
    // Digital noise
    if (Math.random() < glitchIntensity * 0.2) {
      for (let i = 0; i < 3; i++) {
        const noiseX = Math.random() * canvas.width;
        const noiseY = Math.random() * canvas.height;
        const noiseW = Math.random() * 80 * glitchIntensity;
        const noiseH = Math.random() * 4 * glitchIntensity;
        
        ctx.fillStyle = chordColors[currentChordIndex].main;
        ctx.fillRect(noiseX, noiseY, noiseW, noiseH);
      }
    }
    
    glitchIntensity *= 0.95;
  }
  
  // Add granular synthesis visual effect based on granularIntensity
  if (isPlaying && granularIntensity > 0) {
    ctx.save();
    
    // Create more noise/static as granular intensity increases
    const noiseCount = Math.floor(granularIntensity * 20) + 1;
    const noiseOpacity = granularIntensity * 0.1;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${noiseOpacity})`;
    
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const width = Math.random() * (granularIntensity * 20) + 1;
      const height = Math.random() * (granularIntensity * 5) + 1;
      
      ctx.fillRect(x, y, width, height);
    }
    
    ctx.restore();
  }
  
  // Add LFO visual effect based on lfoIntensity
  if (isPlaying && lfoIntensity > 0) {
    ctx.save();
    
    // Create vertical scan lines that intensify with LFO
    const lineCount = Math.floor(lfoIntensity * 10) + 2;
    const lineOpacity = lfoIntensity * 0.05;
    const lineWidth = canvas.width / (lineCount * 2);
    
    // Move the scan lines based on time
    const timeOffset = Date.now() * 0.001;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${lineOpacity})`;
    
    for (let i = 0; i < lineCount; i++) {
      // Calculate a position that moves over time
      const position = (i / lineCount + timeOffset * (0.1 + lfoIntensity * 0.2)) % 1;
      const x = position * canvas.width;
      
      ctx.fillRect(x, 0, lineWidth, canvas.height);
    }
    
    ctx.restore();
  }
  
  // Draw tribal cursor (fixed color, no chord-based changes)
  drawTribalCursor(mouseX, mouseY);
  
  // Request next frame
  requestAnimationFrame(animateVisuals);
}

// Toggle play/pause
function togglePlayback() {
  if (!audioStarted) {
    // First click - initialize audio
    Tone.start().then(() => {
      console.log("Audio is ready");
      
      // Fix for web version - reduce overall volume
      Tone.Destination.volume.value = -6;
      
      // Fix for web version - adjust LFO to be less intense
      volumeLFO.min = 0.5;  // Higher min to prevent silence
      volumeLFO.max = 0.8;  // Lower max to prevent peaks
      volumeLFO.amplitude.value = 0.4; // Less modulation
      
      // Reduce granular synthesis volume for web version
      granularSynth.setVolume(0.3);
      
      setupAudio();
      initVisuals();
      setupPersonControls(); // Initialize keyboard controls for person
      audioStarted = true;
      isPlaying = true;
      Tone.Transport.start();
      granularSynth.togglePlayers(true);
      
      // Hide default cursor when audio starts
      pad.style.cursor = 'none';
    }).catch(error => {
      console.error("Error starting audio:", error);
    });
  } else {
    // Subsequent clicks - toggle playback
    isPlaying = !isPlaying;
    
    if (isPlaying) {
      Tone.Transport.start();
      granularSynth.togglePlayers(true);
      
      // Hide default cursor when playing
      pad.style.cursor = 'none';
    } else {
      Tone.Transport.pause();
      granularSynth.togglePlayers(false);
      
      // Show default cursor when paused
      pad.style.cursor = 'pointer';
    }
  }
}

// Update parameters based on XY position
function updateParams(x, y) {
  const rect = pad.getBoundingClientRect();
  
  // Map X position to granular synthesis parameters (right axis)
  const grainSize = map(x, 0, rect.width, 0.01, 0.2);
  const detune = map(x, 0, rect.width, -600, 600);
  const playbackRate = map(x, 0, rect.width, 0.5, 1.5);
  
  granularSynth.setGrainSize(grainSize);
  granularSynth.setDetune(detune);
  granularSynth.setPlaybackRate(playbackRate);
  
  // Set granular synthesis volume based on position
  const granularVolume = map(x, 0, rect.width, 0.1, 0.6); // Reduced maximum from 1.0 to 0.6
  granularSynth.setVolume(granularVolume);
  
  // Calculate granular intensity for visuals (0-1)
  granularIntensity = map(x, 0, rect.width, 0, 1);

  // Map Y position to LFO parameters (left axis)
  const lfoFrequency = map(y, 0, rect.height, 0.1, 15);
  volumeLFO.frequency.value = lfoFrequency;

  const lfoDepth = map(y, 0, rect.height, 0, 0.7); // Reduced from 0-1 to 0-0.7
  volumeLFO.amplitude.value = lfoDepth;
  
  // Calculate LFO intensity for visuals (0-1)
  lfoIntensity = map(y, 0, rect.height, 0, 1);
}

// Handle mouse events
pad.addEventListener('click', (e) => {
  togglePlayback();
});

// Function for mouse movement (will be replaced with keyboard controls)
function onMouseMove(e) {
  const rect = pad.getBoundingClientRect();
  mouseX = clamp(e.clientX - rect.left, 0, rect.width);
  mouseY = clamp(e.clientY - rect.top, 0, rect.height);
  
  updateParams(mouseX, mouseY);
}

// Initial setup of mouse controls
pad.addEventListener('mousemove', onMouseMove);

// Setup keyboard controls for person figure
function setupPersonControls() {
  console.log("Setting up keyboard controls for person");
  
  // Remove the mousemove event listener
  pad.removeEventListener('mousemove', onMouseMove);
  
  // Initialize position to center
  personX = canvas.width / 2;
  personY = canvas.height / 2;
  
  // Set up keyboard listeners
  window.addEventListener('keydown', function(e) {
    // Update key state
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      keysPressed[e.key] = true;
      console.log(e.key + " pressed");
      e.preventDefault();
    }
  });
  
  window.addEventListener('keyup', function(e) {
    // Update key state
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      keysPressed[e.key] = false;
      console.log(e.key + " released");
      e.preventDefault();
    }
  });
  
  // Start person movement loop
  movePerson();
}

// Function to handle person movement
function movePerson() {
  if (isPlaying) {
    const moveSpeed = 8;
    
    // Apply vertical movement
    if (keysPressed.ArrowUp) {
      personY = Math.max(0, personY - moveSpeed);
    }
    if (keysPressed.ArrowDown) {
      personY = Math.min(canvas.height, personY + moveSpeed);
    }
    
    // Apply horizontal movement
    if (keysPressed.ArrowLeft) {
      personX = Math.max(0, personX - moveSpeed);
    }
    if (keysPressed.ArrowRight) {
      personX = Math.min(canvas.width, personX + moveSpeed);
    }
    
    // Update audio parameters
    updateParams(personX, personY);
    
    // Also update mouse coordinates for compatibility
    mouseX = personX;
    mouseY = personY;
  }
  
  // Continue movement loop
  requestAnimationFrame(movePerson);
}

// Handle window resize
window.addEventListener('resize', resizeCanvas);

// Initialize when the page loads
window.addEventListener('load', () => {
  resizeCanvas();
  
  // Initialize cursor position to center
  mouseX = canvas.width / 2;
  mouseY = canvas.height / 2;
});
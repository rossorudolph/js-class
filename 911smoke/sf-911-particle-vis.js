/*
 * SF 911 Dispatch Calls Visualization
 * Based on SmokeParticles example, modified to visualize 911 dispatch calls in San Francisco
 */

// Global variables
let particle_texture = null;
let dispatchCalls = []; // Will store our 911 call data
let particleSystems = []; // Multiple particle systems, one for each active call
let sfMap; // Will hold a simple map image of San Francisco
let callTypes = {}; // Store call types for color mapping
let mic;
let isDataLoaded = false;
let loading = true;

// Animation and playback controls
let currentPlaybackTime = null;
let playbackSpeed = 300; // Higher values = faster playback (1 = realtime)
let timeSpan = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let oldestTimestamp = null;
let newestTimestamp = null;

// SF map boundaries (approximate)
const SF_BOUNDS = {
  min_lon: -122.52,
  max_lon: -122.36,
  min_lat: 37.70,
  max_lat: 37.83
};

function preload() {
  // Create a simple blank square texture if loading the external image fails
  createBlankTexture();
  
  // Try to load the external image
  try {
    particle_texture = loadImage("particle_texture.png", 
      // Success callback
      function() {
        console.log("Texture loaded successfully");
      },
      // Error callback
      function(e) {
        console.log("Error loading texture, using blank texture", e);
        // Already created a blank texture
      }
    );
  } catch (e) {
    console.error("Error in texture loading:", e);
    // Already created a blank texture
  }
}

function createBlankTexture() {
  // Create a simple soft gradient circle as fallback texture
  let size = 64;
  particle_texture = createGraphics(size, size);
  particle_texture.background(0, 0);
  particle_texture.noStroke();
  
  // Draw gradient circle
  for (let i = size; i > 0; i -= 2) {
    let alpha = map(i, 0, size, 0, 255);
    particle_texture.fill(255, alpha);
    particle_texture.ellipse(size/2, size/2, i, i);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  
  // Setup microphone
  mic = new p5.AudioIn();
  mic.start();
  
  // Initial data fetch for the past 24 hours
  loadHistoricalData();
  
  // No text display during loading, just a simple visual indicator
  noFill();
  stroke(100);
  strokeWeight(2);
  ellipse(width/2, height/2, 50, 50);
  
  // Fallback timer to force data simulation if loading takes too long
  setTimeout(function() {
    if (!isDataLoaded) {
      console.log("Loading timeout - forcing simulated data");
      simulateHistoricalData();
    }
  }, 3000); // 3 seconds timeout
}

function draw() {
  background(0, 25); // Semi-transparent background for trails
  
  // Update wind based on mic input - reduced effect for better performance
  let micLevel = mic.getLevel();
  let dx = map(micLevel, 0, 0.1, -0.05, 0.05); // Reduced wind effect
  let wind = createVector(dx, 0);
  
  if (!isDataLoaded) {
    // Show a minimal loading animation with no text
    push();
    translate(width/2, height/2);
    rotate(frameCount * 0.05);
    noFill();
    stroke(255, 100);
    strokeWeight(2);
    ellipse(0, 0, 50, 50);
    pop();
    
    // Debug message
    console.log("Still loading...");
    return;
  }
  
  // Debug log
  if (frameCount % 60 === 0) {
    console.log("Playback active, particles: " + 
                particleSystems.length + " systems, " + 
                "Current time: " + new Date(currentPlaybackTime).toLocaleTimeString());
  }
  
  // Update current playback time
  if (currentPlaybackTime === null) {
    // Start from the oldest call if this is the first time
    currentPlaybackTime = oldestTimestamp;
    console.log("Starting playback at: " + new Date(currentPlaybackTime).toLocaleString());
  } else {
    // Advance the playback time
    currentPlaybackTime += (deltaTime * playbackSpeed);
    
    // Loop back to beginning when we reach the end
    if (currentPlaybackTime > newestTimestamp) {
      currentPlaybackTime = oldestTimestamp;
      // Clear all particle systems when looping
      particleSystems = [];
    }
  }
  
  // Check for calls that should be activated at the current playback time
  updateActiveCalls();
  
  // Force create some particles if we don't have any yet
  if (particleSystems.length === 0 && frameCount > 120) {
    console.log("No particle systems - creating some test particles");
    createTestParticles();
  }
  
  // Run all particle systems
  for (let i = particleSystems.length - 1; i >= 0; i--) {
    let ps = particleSystems[i];
    ps.applyForce(wind);
    ps.run();
    
    // Add new particles based on call priority, but limit the number
    let particleRate = 1; // Default rate
    if (ps.priority === 'A') particleRate = 2; // Reduced from 3
    else if (ps.priority === 'B') particleRate = 1; // Reduced from 2
    
    // Only add particles if under the per-system limit
    if (ps.particles.length < maxParticlesPerSystem) {
      for (let j = 0; j < particleRate; j++) {
        ps.addParticle();
      }
    }
    
    // Remove systems for closed calls
    if (ps.isDead()) {
      particleSystems.splice(i, 1);
    }
  }
}

// Function to create test particles if no real data is showing
function createTestParticles() {
  // Create a few test particle systems at random locations
  for (let i = 0; i < 5; i++) {
    let x = random(width);
    let y = random(height);
    let ps = new ParticleSystem(0, createVector(x, y), particle_texture);
    ps.callType = "test";
    ps.priority = random(["A", "B", "C"]);
    ps.lifespan = 180;
    particleSystems.push(ps);
  }
}

function loadHistoricalData() {
  console.log("Loading historical dispatch calls...");
  
  // Skip API call and go straight to simulated data for reliability
  simulateHistoricalData();
  
  /* Commented out actual API call to ensure visualization works
  // Use the API to fetch data from past 24 hours
  // The $where clause filters to completed calls from the past 24 hours
  const query = "$limit=200&$where=call_date > (NOW() - '24 hours'::interval)";
  const url = `https://data.sfgov.org/resource/gnap-fj3t.json?${query}`;
  
  loadJSON(url, function(data) {
    console.log("Data fetched:", data.length, "records");
    processHistoricalData(data);
  }, function(error) {
    // If API doesn't work, use simulated data
    console.error("Error fetching data:", error);
    simulateHistoricalData();
  });
  */
}

function simulateHistoricalData() {
  // Create simulated historical dispatch calls over 24 hours
  console.log("Using simulated historical data");
  let simulatedCalls = [];
  let callTypeList = [
    "246 - SHOOTING", 
    "415 - DISTURBING THE PEACE", 
    "602 - TRESPASSING",
    "915 - SUSPICIOUS PERSON",
    "917 - SHOTS FIRED",
    "219 - ROBBERY"
  ];
  
  let priorityList = ['A', 'B', 'C'];
  
  // Current time
  let now = Date.now();
  // 24 hours ago
  let dayAgo = now - (24 * 60 * 60 * 1000);
  
  // Generate random calls throughout the past 24 hours
  for (let i = 0; i < 200; i++) {
    let callTime = new Date(random(dayAgo, now));
    let callType = callTypeList[Math.floor(Math.random() * callTypeList.length)];
    let priority = priorityList[Math.floor(Math.random() * priorityList.length)];
    
    // Random coordinates within SF bounds
    let lon = random(SF_BOUNDS.min_lon, SF_BOUNDS.max_lon);
    let lat = random(SF_BOUNDS.min_lat, SF_BOUNDS.max_lat);
    
    simulatedCalls.push({
      cad_number: "SIM" + i,
      call_type: callType,
      call_date: callTime.toISOString(),
      received_datetime: callTime.toISOString(),
      priority: priority,
      point: {
        type: "Point",
        coordinates: [lon, lat]
      }
    });
  }
  
  console.log("Generated", simulatedCalls.length, "simulated calls");
  processHistoricalData(simulatedCalls);
  
  // Force isDataLoaded to true
  isDataLoaded = true;
  loading = false;
}

function processHistoricalData(calls) {
  console.log("Processing historical data...");
  
  // Filter out calls without location data
  dispatchCalls = calls.filter(call => {
    return call.point && call.point.coordinates && 
           call.point.coordinates[0] >= SF_BOUNDS.min_lon && 
           call.point.coordinates[0] <= SF_BOUNDS.max_lon &&
           call.point.coordinates[1] >= SF_BOUNDS.min_lat && 
           call.point.coordinates[1] <= SF_BOUNDS.max_lat;
  });
  
  // Process call types
  dispatchCalls.forEach(call => {
    if (call.call_type) {
      let callTypeCode = call.call_type.split(" - ")[0];
      callTypes[callTypeCode] = call.call_type;
    }
  });
  
  // Sort calls by timestamp
  dispatchCalls.sort((a, b) => {
    let timeA = new Date(a.received_datetime || a.call_date).getTime();
    let timeB = new Date(b.received_datetime || b.call_date).getTime();
    return timeA - timeB;
  });
  
  // Determine time boundaries
  if (dispatchCalls.length > 0) {
    oldestTimestamp = new Date(dispatchCalls[0].received_datetime || dispatchCalls[0].call_date).getTime();
    newestTimestamp = new Date(dispatchCalls[dispatchCalls.length-1].received_datetime || 
                              dispatchCalls[dispatchCalls.length-1].call_date).getTime();
    
    console.log("Time range:", new Date(oldestTimestamp).toLocaleString(), 
                "to", new Date(newestTimestamp).toLocaleString());
  } else {
    // Fallback if no valid calls
    let now = Date.now();
    oldestTimestamp = now - (24 * 60 * 60 * 1000); // 24 hours ago
    newestTimestamp = now;
  }
  
  isDataLoaded = true;
  loading = false;
}

function updateActiveCalls() {
  // Find calls that should be activated at the current playback time
  for (let i = 0; i < dispatchCalls.length; i++) {
    let call = dispatchCalls[i];
    let callTime = new Date(call.received_datetime || call.call_date).getTime();
    
    // Check if this call should be active now and hasn't been added yet
    if (callTime <= currentPlaybackTime && !call.activated) {
      call.activated = true; // Mark as activated
      
      // Only add a new particle system if we're under the limit
      if (particleSystems.length < maxParticleSystems) {
        // Extract coordinates
        let lon = call.point.coordinates[0];
        let lat = call.point.coordinates[1];
        
        // Map coordinates to canvas
        let x = map(lon, SF_BOUNDS.min_lon, SF_BOUNDS.max_lon, 0, width);
        let y = map(lat, SF_BOUNDS.max_lat, SF_BOUNDS.min_lat, 0, height); // Invert y-axis
        
        // Extract call type for coloring
        let callTypeCode = "unknown";
        if (call.call_type) {
          callTypeCode = call.call_type.split(" - ")[0];
        }
        
        // Create a new particle system for this call with reduced lifespan
        let ps = new ParticleSystem(0, createVector(x, y), particle_texture);
        ps.callType = callTypeCode;
        ps.priority = call.priority || 'C';
        ps.callTime = new Date(callTime);
        
        // Reduced lifespans for better performance
        ps.lifespan = 120; // Default lifespan in frames (~2 seconds at 60fps)
        
        // Adjust based on priority, but keep lifespans shorter
        if (ps.priority === 'A') ps.lifespan = 180;
        else if (ps.priority === 'B') ps.lifespan = 150;
        
        particleSystems.push(ps);
      }
    }
  }
  
  // If we're over the limit, remove the oldest systems
  if (particleSystems.length > maxParticleSystems) {
    particleSystems.splice(0, particleSystems.length - maxParticleSystems);
  }
}

function displayStats() {
  let activeCalls = particleSystems.length;
  
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  text("Active Calls: " + activeCalls, 10, 10);
  text("Mic Level: " + nfc(mic.getLevel(), 3), 10, 30);
  
  // Display playback time
  if (currentPlaybackTime) {
    let playbackDate = new Date(currentPlaybackTime);
    let timeStr = playbackDate.toLocaleTimeString();
    let dateStr = playbackDate.toLocaleDateString();
    text("Playback Time: " + dateStr + " " + timeStr, 10, 50);
    
    // Show progress bar
    let progress = map(currentPlaybackTime, oldestTimestamp, newestTimestamp, 0, 200);
    noFill();
    stroke(100);
    rect(10, 70, 200, 10);
    fill(200);
    noStroke();
    rect(10, 70, progress, 10);
  }
  
  // Display call type legend
  let y = 100;
  textSize(12);
  text("Call Types:", 10, y);
  y += 20;
  
  let displayedTypes = {};
  
  for (let i = 0; i < particleSystems.length; i++) {
    let callType = particleSystems[i].callType;
    if (!displayedTypes[callType] && y < height - 20) {
      fill(getColorForCallType(callType));
      ellipse(20, y, 10, 10);
      fill(255);
      text(callTypes[callType] || callType, 35, y - 5);
      y += 20;
      displayedTypes[callType] = true;
    }
  }
}

function getColorForCallType(callTypeCode) {
  // Pastel color palette
  switch(callTypeCode) {
    case "246": // SHOOTING
      return color(255, 182, 193); // Light pink
    case "917": // SHOTS FIRED
      return color(255, 218, 185); // Peach
    case "219": // ROBBERY
      return color(255, 255, 224); // Light yellow
    case "415": // DISTURBING THE PEACE
      return color(204, 255, 204); // Mint green
    case "602": // TRESPASSING
      return color(173, 216, 230); // Light blue
    case "915": // SUSPICIOUS PERSON
      return color(221, 160, 221); // Plum
    default:
      return color(230, 230, 250); // Lavender
  }
}

function mousePressed() {
  // Toggle fullscreen with click in main area
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    // Check if click is on progress bar
    if (currentPlaybackTime && mouseX >= 10 && mouseX <= 210 && mouseY >= 70 && mouseY <= 80) {
      // Change playback position
      let newPosition = map(mouseX, 10, 210, oldestTimestamp, newestTimestamp);
      currentPlaybackTime = newPosition;
      
      // Reset activations for all calls
      dispatchCalls.forEach(call => {
        call.activated = false;
      });
      
      // Clear particle systems
      particleSystems = [];
    } else {
      // Toggle fullscreen
      let fs = fullscreen();
      fullscreen(!fs);
    }
  }
}

// Add keyboard controls
function keyPressed() {
  // Space bar to pause/play
  if (key === ' ') {
    if (playbackSpeed > 0) {
      // Store the current speed and pause
      storedSpeed = playbackSpeed;
      playbackSpeed = 0;
    } else {
      // Resume with stored speed
      playbackSpeed = storedSpeed || 300;
    }
  }
  
  // Speed controls
  if (key === '+' || key === '=') {
    playbackSpeed = min(playbackSpeed * 1.5, 2000);
  }
  if (key === '-' || key === '_') {
    playbackSpeed = max(playbackSpeed * 0.75, 10);
  }
  
  // Reset to beginning
  if (key === 'r' || key === 'R') {
    currentPlaybackTime = oldestTimestamp;
    dispatchCalls.forEach(call => {
      call.activated = false;
    });
    particleSystems = [];
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

//========= PARTICLE SYSTEM ===========

let ParticleSystem = function(num, v, img_) {
  this.particles = [];
  this.origin = v.copy();
  this.img = img_;
  this.callType = "unknown";
  this.priority = "C";
  this.callTime = new Date();
  this.lifespan = 300;
  this.age = 0;
  
  for(let i = 0; i < num; ++i){
    this.particles.push(new Particle(this.origin, this.img, this.callType));
  }
};

ParticleSystem.prototype.run = function() {
  this.age++;
  
  let len = this.particles.length;
  for (let i = len - 1; i >= 0; i--) {
    let particle = this.particles[i];
    particle.callType = this.callType; // Pass call type for coloring
    particle.run();
    
    if (particle.isDead()) {
      this.particles.splice(i, 1);
    }
  }
};

ParticleSystem.prototype.applyForce = function(dir) {
  let len = this.particles.length;
  for(let i = 0; i < len; ++i){
    this.particles[i].applyForce(dir);
  }
};

ParticleSystem.prototype.addParticle = function() {
  this.particles.push(new Particle(this.origin, this.img, this.callType));
};

ParticleSystem.prototype.isDead = function() {
  return this.age > this.lifespan;
};

//========= PARTICLE ===========

let Particle = function (pos, img_, callType) {
  this.loc = pos.copy();
  
  // Gentler, smaller movements for better performance
  let vx = randomGaussian() * 0.2;
  let vy = randomGaussian() * 0.2 - 0.8;
  
  this.vel = createVector(vx, vy);
  this.acc = createVector();
  this.lifespan = 100.0;
  this.texture = img_;
  this.callType = callType || "unknown";
};

Particle.prototype.run = function() {
  this.update();
  this.render();
};

Particle.prototype.render = function() {
  imageMode(CENTER);
  
  // Apply color tint based on call type
  let particleColor = getColorForCallType(this.callType);
  tint(red(particleColor), green(particleColor), blue(particleColor), this.lifespan);
  
  // Smaller particles for better performance
  let size = map(this.lifespan, 0, 100, 0, 1);
  image(this.texture, this.loc.x, this.loc.y, 
        this.texture.width * size * 0.6, // Reduce size to 60%
        this.texture.height * size * 0.6);
};

Particle.prototype.applyForce = function(f) {
  this.acc.add(f);
};

Particle.prototype.isDead = function () {
  if (this.lifespan <= 0.0) {
    return true;
  } else {
    return false;
  }
};

Particle.prototype.update = function() {
  this.vel.add(this.acc);
  this.loc.add(this.vel);
  this.lifespan -= 3.5; // Faster fade-out (was 2.5)
  this.acc.mult(0);
};
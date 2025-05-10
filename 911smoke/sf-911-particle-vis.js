/*
 * SF 911 Dispatch Calls Visualization
 * Based on SmokeParticles example, modified to visualize 911 dispatch calls in San Francisco
 */

// Global variables
let particle_texture = null;
let dispatchCalls = []; // Will store our 911 call data
let particleSystems = []; // Multiple particle systems, one for each active call
let sfMap; // Will hold a simple map image of San Francisco
let lastFetchTime = 0;
let fetchInterval = 60000; // Fetch new data every 60 seconds
let callTypes = {}; // Store call types for color mapping
let mic;
let isDataLoaded = false;
let loading = true;

// SF map boundaries (approximate)
const SF_BOUNDS = {
  min_lon: -122.52,
  max_lon: -122.36,
  min_lat: 37.70,
  max_lat: 37.83
};

function preload() {
  particle_texture = loadImage("particle_texture.png");
  // Optionally add a simple SF map background
  // sfMap = loadImage("sf_map.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  
  // Setup microphone
  mic = new p5.AudioIn();
  mic.start();
  
  // Initial data fetch
  fetchDispatchCalls();
  
  // Display loading text
  textSize(24);
  textAlign(CENTER, CENTER);
  fill(255);
  text("Loading SF 911 Dispatch Data...", width/2, height/2);
}

function draw() {
  background(0, 25); // Semi-transparent background for trails
  
  // Update wind based on mic input
  let micLevel = mic.getLevel();
  let dx = map(micLevel, 0, 0.1, -0.1, 0.1);
  let wind = createVector(dx, 0);
  
  // Check if it's time to fetch new data
  if (millis() - lastFetchTime > fetchInterval) {
    fetchDispatchCalls();
  }
  
  if (!isDataLoaded) {
    // Show loading animation
    push();
    translate(width/2, height/2);
    rotate(frameCount * 0.05);
    noFill();
    stroke(255);
    strokeWeight(2);
    ellipse(0, 0, 50, 50);
    pop();
    return;
  }
  
  // Run all particle systems
  for (let i = particleSystems.length - 1; i >= 0; i--) {
    let ps = particleSystems[i];
    ps.applyForce(wind);
    ps.run();
    
    // Add new particles based on call priority
    let particleRate = 1; // Default rate
    if (ps.priority === 'A') particleRate = 3;
    else if (ps.priority === 'B') particleRate = 2;
    
    for (let j = 0; j < particleRate; j++) {
      ps.addParticle();
    }
    
    // Remove systems for closed calls
    if (ps.isDead()) {
      particleSystems.splice(i, 1);
    }
  }
  
  // Display some stats
  displayStats();
}

function fetchDispatchCalls() {
  // In a real implementation, this would fetch from the actual API
  // For now, we'll simulate with sample data
  console.log("Fetching dispatch calls...");
  loadJSON('https://data.sfgov.org/resource/gnap-fj3t.json?$limit=50', function(data) {
    console.log("Data fetched:", data.length, "records");
    processDispatchCalls(data);
    lastFetchTime = millis();
    isDataLoaded = true;
    loading = false;
  }, function(error) {
    // If real API doesn't work, use simulated data
    console.error("Error fetching data:", error);
    simulateDispatchCalls();
    lastFetchTime = millis();
    isDataLoaded = true;
    loading = false;
  });
}

function simulateDispatchCalls() {
  // Create simulated dispatch calls
  console.log("Using simulated data");
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
  
  // Generate random calls throughout SF
  for (let i = 0; i < 20; i++) {
    let now = new Date();
    let callType = callTypeList[Math.floor(Math.random() * callTypeList.length)];
    let priority = priorityList[Math.floor(Math.random() * priorityList.length)];
    
    // Random coordinates within SF bounds
    let lon = random(SF_BOUNDS.min_lon, SF_BOUNDS.max_lon);
    let lat = random(SF_BOUNDS.min_lat, SF_BOUNDS.max_lat);
    
    simulatedCalls.push({
      cad_number: "SIM" + i,
      call_type: callType,
      call_date: now.toISOString(),
      received_datetime: now.toISOString(),
      priority: priority,
      point: {
        type: "Point",
        coordinates: [lon, lat]
      }
    });
  }
  
  processDispatchCalls(simulatedCalls);
}

function processDispatchCalls(calls) {
  dispatchCalls = calls;
  
  // Process calls to create particle systems
  calls.forEach(call => {
    // Skip calls without location data
    if (!call.point || !call.point.coordinates) return;
    
    // Extract coordinates
    let lon = call.point.coordinates[0];
    let lat = call.point.coordinates[1];
    
    // Skip if outside SF bounds
    if (lon < SF_BOUNDS.min_lon || lon > SF_BOUNDS.max_lon || 
        lat < SF_BOUNDS.min_lat || lat > SF_BOUNDS.max_lat) return;
    
    // Map coordinates to canvas
    let x = map(lon, SF_BOUNDS.min_lon, SF_BOUNDS.max_lon, 0, width);
    let y = map(lat, SF_BOUNDS.max_lat, SF_BOUNDS.min_lat, 0, height); // Invert y-axis
    
    // Extract call type for coloring
    let callTypeCode = "unknown";
    if (call.call_type) {
      callTypeCode = call.call_type.split(" - ")[0];
      callTypes[callTypeCode] = call.call_type;
    }
    
    // Create a new particle system for this call
    let ps = new ParticleSystem(0, createVector(x, y), particle_texture);
    ps.callType = callTypeCode;
    ps.priority = call.priority || 'C';
    ps.callTime = new Date(call.received_datetime || call.call_date);
    ps.lifespan = 300; // Default lifespan in frames
    
    // Adjust based on priority
    if (ps.priority === 'A') ps.lifespan = 600;
    else if (ps.priority === 'B') ps.lifespan = 450;
    
    particleSystems.push(ps);
  });
}

function displayStats() {
  let activeCalls = particleSystems.length;
  
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  text("Active Calls: " + activeCalls, 10, 10);
  text("Mic Level: " + nfc(mic.getLevel(), 3), 10, 30);
  
  // Display call type legend
  let y = 60;
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
  // Map call type codes to colors
  switch(callTypeCode) {
    case "246": // SHOOTING
      return color(255, 0, 0);
    case "917": // SHOTS FIRED
      return color(255, 50, 0);
    case "219": // ROBBERY
      return color(255, 150, 0);
    case "415": // DISTURBING THE PEACE
      return color(255, 255, 0);
    case "602": // TRESPASSING
      return color(0, 255, 255);
    case "915": // SUSPICIOUS PERSON
      return color(0, 100, 255);
    default:
      return color(150);
  }
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    let fs = fullscreen();
    fullscreen(!fs);
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
  
  let vx = randomGaussian() * 0.3;
  let vy = randomGaussian() * 0.3 - 1.0;
  
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
  
  image(this.texture, this.loc.x, this.loc.y);
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
  this.lifespan -= 2.5;
  this.acc.mult(0);
};
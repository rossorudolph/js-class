// Real-time data loading functions

// This function will fetch real 911 dispatch data from SF's open data API
function loadRealDispatchData() {
  console.log("Loading real dispatch data from SF Open Data...");
  
  // Construct the query to get data from the last 24 hours
  // The $where clause uses SQL-like syntax and the NOW() function provides current time
  const hoursToLoad = 24;
  
  // Craft API query with parameters
  const query = {
    "$limit": 200, // Limit to 200 records for performance
    "$where": `call_date > (NOW() - '${hoursToLoad} hours'::interval)`, // Last 24 hours
    "$order": "call_date DESC" // Most recent first
  };
  
  // Convert the query object to URL parameters
  const queryString = Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  // SF Open Data API endpoint
  const url = `https://data.sfgov.org/resource/gnap-fj3t.json?${queryString}`;
  
  // Fetch data using p5's loadJSON function
  loadJSON(url, 
    // Success callback
    function(data) {
      console.log(`Successfully loaded ${data.length} records from SF Open Data`);
      processRealData(data);
    },
    // Error callback
    function(error) {
      console.error("Error loading data from SF Open Data:", error);
      console.log("Falling back to simulated data");
      simulateDispatchData();
    }
  );
}

// Process the real data and prepare it for visualization
function processRealData(data) {
  console.log("Processing real 911 dispatch data...");
  
  // Check if we have valid data
  if (!data || data.length === 0) {
    console.warn("No valid data received, falling back to simulation");
    simulateDispatchData();
    return;
  }
  
  // Clear existing calls and reset
  dispatchCalls = [];
  particleSystems = [];
  
  // Process each call in the dataset
  data.forEach(call => {
    // Skip calls without required data
    if (!call.call_type || !call.received_datetime || !call.priority) {
      return;
    }
    
    // Extract location coordinates if available
    let location = null;
    if (call.point && call.point.coordinates) {
      location = {
        longitude: call.point.coordinates[0],
        latitude: call.point.coordinates[1]
      };
    } else {
      // Skip calls without location data
      return;
    }
    
    // Check if the location is within SF bounds
    if (location.longitude < SF_BOUNDS.min_lon || location.longitude > SF_BOUNDS.max_lon || 
        location.latitude < SF_BOUNDS.min_lat || location.latitude > SF_BOUNDS.max_lat) {
      return;
    }
    
    // Convert the call to our internal format
    let processedCall = {
      id: call.cad_number || `call-${dispatchCalls.length}`,
      callType: call.call_type.split(' - ')[0] || "unknown", // Extract the code portion
      fullCallType: call.call_type,
      receivedTime: new Date(call.received_datetime),
      dispatchTime: call.dispatch_datetime ? new Date(call.dispatch_datetime) : null,
      onSceneTime: call.onscene_datetime ? new Date(call.onscene_datetime) : null,
      priority: call.priority,
      location: location,
      address: call.address,
      neighborhood: call.analysis_neighborhood || call.supervisor_district || "Unknown",
      status: call.disposition || "Active"
    };
    
    // Calculate missing timestamps for visualization if needed
    if (!processedCall.dispatchTime) {
      // If no dispatch time, estimate based on priority (A=fast, C=slow)
      const delayMinutes = processedCall.priority === 'A' ? 1 : 
                          processedCall.priority === 'B' ? 3 : 5;
      processedCall.dispatchTime = new Date(processedCall.receivedTime.getTime() + (delayMinutes * 60 * 1000));
    }
    
    if (!processedCall.onSceneTime) {
      // If no on-scene time, estimate based on priority
      const responseMinutes = processedCall.priority === 'A' ? 5 : 
                             processedCall.priority === 'B' ? 10 : 15;
      processedCall.onSceneTime = new Date(processedCall.dispatchTime.getTime() + (responseMinutes * 60 * 1000));
    }
    
    // Add to our collection
    dispatchCalls.push(processedCall);
  });
  
  console.log(`Processed ${dispatchCalls.length} valid calls with location data`);
  
  // If we got enough data, start the visualization
  if (dispatchCalls.length > 0) {
    // Sort by time
    dispatchCalls.sort((a, b) => a.receivedTime - b.receivedTime);
    
    // Start the playback
    startPlayback();
  } else {
    console.warn("Not enough valid calls with location data, falling back to simulation");
    simulateDispatchData();
  }
}

// Simulate data when real data is unavailable or insufficient
function simulateDispatchData() {
  console.log("Generating simulated 911 dispatch data...");
  
  // Clear any existing data
  dispatchCalls = [];
  particleSystems = [];
  
  // Common call types in SF's system
  const callTypeList = [
    { code: "246", description: "SHOOTING" },
    { code: "415", description: "DISTURBING THE PEACE" },
    { code: "602", description: "TRESPASSING" },
    { code: "915", description: "SUSPICIOUS PERSON" },
    { code: "917", description: "SHOTS FIRED" },
    { code: "219", description: "ROBBERY" },
    { code: "222", description: "VEHICLE COLLISION" },
    { code: "852", description: "MEDICAL EMERGENCY" }
  ];
  
  // Common neighborhoods in SF
  const neighborhoods = [
    "TENDERLOIN", "MISSION", "SOMA", "NOB HILL", "DOWNTOWN", "SUNSET", 
    "RICHMOND", "BAYVIEW", "CASTRO", "HAIGHT ASHBURY", "MARINA"
  ];
  
  // Generate calls over the past 24 hours
  const now = new Date();
  const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  
  // Number of calls to generate
  const numCalls = 150;
  
  for (let i = 0; i < numCalls; i++) {
    // Random time in the past 24 hours
    const callTime = new Date(dayAgo.getTime() + Math.random() * (now.getTime() - dayAgo.getTime()));
    
    // Random call type
    const callTypeIndex = Math.floor(Math.random() * callTypeList.length);
    const callType = callTypeList[callTypeIndex];
    
    // Random priority (weighted to have more C than A)
    const priorityRoll = Math.random();
    const priority = priorityRoll < 0.2 ? 'A' : (priorityRoll < 0.5 ? 'B' : 'C');
    
    // Random location within SF bounds
    const longitude = SF_BOUNDS.min_lon + Math.random() * (SF_BOUNDS.max_lon - SF_BOUNDS.min_lon);
    const latitude = SF_BOUNDS.min_lat + Math.random() * (SF_BOUNDS.max_lat - SF_BOUNDS.min_lat);
    
    // Random neighborhood
    const neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
    
    // Calculate dispatch and onscene times based on priority
    const dispatchDelay = priority === 'A' ? 1 : (priority === 'B' ? 3 : 5); // minutes
    const responseTime = priority === 'A' ? 5 : (priority === 'B' ? 10 : 15); // minutes
    
    const dispatchTime = new Date(callTime.getTime() + (dispatchDelay * 60 * 1000));
    const onSceneTime = new Date(dispatchTime.getTime() + (responseTime * 60 * 1000));
    
    // Create the simulated call record
    dispatchCalls.push({
      id: `sim-${i}`,
      callType: callType.code,
      fullCallType: `${callType.code} - ${callType.description}`,
      receivedTime: callTime,
      dispatchTime: dispatchTime,
      onSceneTime: onSceneTime,
      priority: priority,
      location: {
        longitude: longitude,
        latitude: latitude
      },
      address: `${Math.floor(Math.random() * 2000)} BLOCK OF ${["MARKET", "MISSION", "FOLSOM", "VALENCIA", "HAIGHT", "GEARY"][Math.floor(Math.random() * 6)]} ST`,
      neighborhood: neighborhood,
      status: Math.random() < 0.8 ? "HAN - HANDLED" : "GOA - GONE ON ARRIVAL"
    });
  }
  
  // Sort by time
  dispatchCalls.sort((a, b) => a.receivedTime - b.receivedTime);
  
  console.log(`Generated ${dispatchCalls.length} simulated calls`);
  
  // Start the playback
  startPlayback();
}

// Setup playback of 911 call data
function startPlayback() {
  console.log("Starting playback of dispatch calls...");
  
  if (!dispatchCalls || dispatchCalls.length === 0) {
    console.error("No dispatch calls to play back");
    return;
  }
  
  // Set playback boundaries
  oldestTimestamp = dispatchCalls[0].receivedTime.getTime();
  newestTimestamp = dispatchCalls[dispatchCalls.length - 1].receivedTime.getTime();
  
  // Start from the beginning
  currentPlaybackTime = oldestTimestamp;
  
  // Reset all activation flags
  dispatchCalls.forEach(call => {
    call.activated = false;
    call.completed = false;
  });
  
  console.log(`Playback range: ${new Date(oldestTimestamp).toLocaleString()} to ${new Date(newestTimestamp).toLocaleString()}`);
  console.log("Playback ready");
  
  // Data is loaded, start visualization
  isDataLoaded = true;
}

// Check for calls that should be activated or deactivated based on current playback time
function updateActiveCalls() {
  // Check each call
  for (let i = 0; i < dispatchCalls.length; i++) {
    let call = dispatchCalls[i];
    
    // Get timestamps
    let receivedTime = call.receivedTime.getTime();
    let onSceneTime = call.onSceneTime.getTime();
    
    // If the call should be active now and hasn't been activated
    if (receivedTime <= currentPlaybackTime && !call.activated) {
      // Mark as activated
      call.activated = true;
      
      // Only create a particle system if we're under the limit
      if (particleSystems.length < maxParticleSystems) {
        createParticleSystemForCall(call);
      }
    }
    
    // If the call has reached its on-scene time, mark as completed
    if (onSceneTime <= currentPlaybackTime && !call.completed) {
      call.completed = true;
    }
  }
  
  // Update any active particle systems
  for (let i = particleSystems.length - 1; i >= 0; i--) {
    let ps = particleSystems[i];
    
    // Find the associated call
    let call = dispatchCalls.find(c => c.id === ps.callId);
    
    // Remove the system if the call is completed
    if (call && call.completed) {
      particleSystems.splice(i, 1);
    }
  }
}

// Create a particle system for a specific call
function createParticleSystemForCall(call) {
  // Convert geographic coordinates to screen position
  let x = map(call.location.longitude, SF_BOUNDS.min_lon, SF_BOUNDS.max_lon, 0, width);
  let y = map(call.location.latitude, SF_BOUNDS.max_lat, SF_BOUNDS.min_lat, 0, height); // Invert Y axis
  
  // Create a new particle system
  let ps = new ParticleSystem(createVector(x, y));
  
  // Set properties from the call
  ps.callId = call.id;
  ps.callType = call.callType;
  ps.priority = call.priority;
  ps.neighborhood = call.neighborhood;
  
  // Add to our collection
  particleSystems.push(ps);
  
  return ps;
}

// Map SF call types to colors
function getColorForCallType(callTypeCode) {
  // Pastel color palette mapped to SF call types
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
    case "222": // VEHICLE COLLISION
      return color(255, 230, 200); // Light orange
    case "852": // MEDICAL EMERGENCY
      return color(180, 180, 255); // Lavender blue
    default:
      return color(230, 230, 250); // Lavender
  }
}
// SF 911 Auto Data Fetching Module
// Automatically loads real data without disrupting animation

// Flag to track if we're currently fetching data
let isFetchingData = false;
// Flag to track if we've successfully loaded data
let hasLoadedRealData = false;
// Timer for periodic data refresh
let dataRefreshInterval = null;

// Set up automatic data loading when this script is loaded
function setupAutoDataFetching() {
  console.log("Setting up automatic data fetching...");
  
  // Initial data load after a short delay to let the visualization start
  setTimeout(function() {
    loadRealDispatchData();
  }, 2000); // 2 second delay
  
  // Set up periodic refresh every 5 minutes (300000 ms)
  dataRefreshInterval = setInterval(function() {
    // Only refresh if we're not currently fetching
    if (!isFetchingData) {
      loadRealDispatchData();
    }
  }, 300000); // 5 minutes
}

// Function to fetch the most recent 911 dispatch data from SF Open Data API
function loadRealDispatchData() {
  // Prevent multiple fetches at once
  if (isFetchingData) {
    console.log("Already fetching data, skipping...");
    return;
  }
  
  console.log("Fetching real 911 dispatch data from SF Open Data API...");
  isFetchingData = true;
  
  try {
    // Create the API endpoint URL with query parameters to get recent calls
    const baseUrl = "https://data.sfgov.org/resource/gnap-fj3t.json";
    const queryParams = "$limit=150&$order=call_date DESC";
    const apiUrl = `${baseUrl}?${queryParams}`;
    
    console.log("Fetching from URL:", apiUrl);
    
    // Fetch the data using p5's loadJSON
    loadJSON(apiUrl, handleDataSuccess, handleDataError);
  } catch (e) {
    console.error("Error initiating data fetch:", e);
    isFetchingData = false;
  }
}

// Success callback for data fetch
function handleDataSuccess(data) {
  console.log("Successfully loaded data from SF Open Data API");
  console.log(`Received ${data.length} records`);
  
  // Process the data
  processRealData(data);
  
  // Set loaded flag
  hasLoadedRealData = true;
  
  // Reset fetching flag
  isFetchingData = false;
}

// Error callback for data fetch
function handleDataError(error) {
  console.error("Error loading data from SF Open Data API:", error);
  console.log("Continuing with existing visualization");
  
  // Reset fetching flag
  isFetchingData = false;
}

// Process the real data from the API and gradually integrate it
function processRealData(data) {
  if (!data || data.length === 0) {
    console.warn("No valid data received from API");
    return;
  }
  
  // Filter to valid calls with location data within SF bounds
  let validCalls = data.filter(call => {
    return call.point && 
           call.point.coordinates &&
           call.point.coordinates[0] >= SF_BOUNDS.min_lon && 
           call.point.coordinates[0] <= SF_BOUNDS.max_lon &&
           call.point.coordinates[1] >= SF_BOUNDS.min_lat && 
           call.point.coordinates[1] <= SF_BOUNDS.max_lat;
  });
  
  console.log(`Found ${validCalls.length} valid calls with location data`);
  
  if (validCalls.length === 0) return;
  
  // If this is our first successful data load, phase out some of the simulated systems
  if (!hasLoadedRealData) {
    // Remove some of the simulated systems to make room for real ones
    // but keep a few for visual consistency
    const keepCount = Math.min(5, particleSystems.length);
    if (particleSystems.length > keepCount) {
      particleSystems.splice(keepCount, particleSystems.length - keepCount);
    }
  }
  
  // Gradually add real systems (staggered to avoid visual jumps)
  const maxNewSystemsAtOnce = Math.min(10, validCalls.length);
  
  // Create a queue of calls to add
  let callsToAdd = validCalls.slice(0, maxNewSystemsAtOnce);
  
  // Add one system now, then schedule the rest with delays
  if (callsToAdd.length > 0) {
    addRealCallSystem(callsToAdd[0]);
    
    // Schedule the rest with staggered timing
    for (let i = 1; i < callsToAdd.length; i++) {
      setTimeout(() => {
        // Only add if we're still under the limit
        if (particleSystems.length < maxParticleSystems) {
          addRealCallSystem(callsToAdd[i]);
        }
      }, i * 500); // Add a new system every 500ms
    }
  }
}

// Add a particle system for a real call
function addRealCallSystem(call) {
  // Get the location data
  const longitude = call.point.coordinates[0];
  const latitude = call.point.coordinates[1];
  
  // Get the call type code (usually in format "XXX - Description")
  let callTypeCode = "unknown";
  if (call.call_type && call.call_type.includes(" - ")) {
    callTypeCode = call.call_type.split(" - ")[0];
  } else if (call.call_type) {
    callTypeCode = call.call_type;
  }
  
  // Get the priority (A, B, C)
  const priority = call.priority || "C";
  
  // Calculate screen position from geo coordinates
  const x = map(longitude, SF_BOUNDS.min_lon, SF_BOUNDS.max_lon, 0, width);
  const y = map(latitude, SF_BOUNDS.max_lat, SF_BOUNDS.min_lat, 0, height); // Invert Y axis
  
  try {
    // Create a new particle system
    let ps = new ParticleSystem(createVector(x, y));
    ps.callType = callTypeCode;
    ps.priority = priority;
    ps.isRealData = true; // Mark as real data
    
    // Set dispatch and onscene times based on real timing when available
    ps.dispatchTime = frameCount;
    
    // Calculate onscene time based on priority
    if (priority === 'A') {
      ps.onSceneTime = ps.dispatchTime + random(300, 500);
    } else if (priority === 'B') {
      ps.onSceneTime = ps.dispatchTime + random(500, 700);
    } else {
      ps.onSceneTime = ps.dispatchTime + random(700, 900);
    }
    
    // Add metadata from the real call
    ps.callData = {
      id: call.cad_number || `unknown`,
      address: call.address || "Unknown location",
      receivedTime: call.received_datetime || null,
      neighborhood: call.analysis_neighborhood || call.supervisor_district || "Unknown"
    };
    
    // Add to active particle systems
    particleSystems.push(ps);
    
    console.log(`Added real call: ${callTypeCode} at ${ps.callData.address}`);
  } catch (e) {
    console.error("Error creating particle system:", e);
  }
}

// Start automatic data fetching when script loads
setupAutoDataFetching();
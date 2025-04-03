import L from "leaflet";

// Convert degrees to radians
export const toRad = (deg) => (deg * Math.PI) / 180;

// Convert radians to degrees
export const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Calculates points along a great circle path between two coordinates
 * @param {number} startLat - Starting latitude in degrees
 * @param {number} startLng - Starting longitude in degrees
 * @param {number} endLat - Ending latitude in degrees
 * @param {number} endLng - Ending longitude in degrees
 * @param {number} numPoints - Number of points to generate along the path
 * @returns {Array} Array of [lat, lng] points along the great circle path
 */
export const calculateGreatCirclePoints = (startLat, startLng, endLat, endLng, numPoints = 100) => {
  // If the difference in longitudes is more than 180°, adjust the smaller one.
  let adjustedStartLng = startLng;
  let adjustedEndLng = endLng;
  if (Math.abs(startLng - endLng) > 180) {
    if (startLng > endLng) {
      // Example: startLng=170, endLng=-170 becomes 170 and 190
      adjustedEndLng = endLng + 360;
    } else {
      // Or vice versa
      adjustedStartLng = startLng + 360;
    }
  }
  
  // Convert degrees to radians
  const lat1 = toRad(startLat);
  const lon1 = toRad(adjustedStartLng);
  const lat2 = toRad(endLat);
  const lon2 = toRad(adjustedEndLng);
  
  // Calculate the angular distance (d) using the haversine formula
  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
  ));
  
  const points = [];
  
  // If the two points are essentially the same, return copies of the start point.
  if (d === 0) {
    for (let i = 0; i <= numPoints; i++) {
      points.push([startLat, startLng]);
    }
    return points;
  }
  
  // Generate points along the great circle using spherical linear interpolation (slerp)
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    let lon = Math.atan2(y, x);
    
    // Convert back to degrees
    let pointLat = toDeg(lat);
    let pointLon = toDeg(lon);
    
    // Re-normalize longitude to be within -180° to 180°
    if (pointLon > 180) {
      pointLon -= 360;
    } else if (pointLon < -180) {
      pointLon += 360;
    }
    
    points.push([pointLat, pointLon]);
  }
  
  return points;
};

/**
 * Splits a great circle path into multiple segments at the antimeridian (IDL)
 * @param {number} startLat - Starting latitude in degrees
 * @param {number} startLng - Starting longitude in degrees
 * @param {number} endLat - Ending latitude in degrees
 * @param {number} endLng - Ending longitude in degrees
 * @param {number} numPoints - Number of points to generate along the path
 * @returns {Array} Array of path segments that don't cross the antimeridian
 */
export const calculateGreatCirclePolylines = (startLat, startLng, endLat, endLng, numPoints = 100) => {
  const points = calculateGreatCirclePoints(startLat, startLng, endLat, endLng, numPoints);
  
  const segments = [];
  let currentSegment = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const [lat1, lon1] = points[i - 1];
    const [lat2, lon2] = points[i];
    
    // Check for antimeridian crossing (large longitude jump)
    if (Math.abs(lon2 - lon1) > 180) {
      // Calculate the fraction of the way from point i-1 to point i where the antimeridian is crossed
      const t = (lon1 > 0 ? 180 - lon1 : -180 - lon1) / (lon2 - lon1);
      
      // Calculate the latitude at the crossing point (linear interpolation)
      const latCrossing = lat1 + t * (lat2 - lat1);
      
      // Add the point at the antimeridian to current segment
      currentSegment.push([latCrossing, lon1 > 0 ? 180 : -180]);
      
      // Save current segment and start a new one
      segments.push(currentSegment);
      
      // Start new segment with point on the other side of the antimeridian
      currentSegment = [[latCrossing, lon2 > 0 ? 180 : -180], points[i]];
    } else {
      // No crossing, add the point to the current segment
      currentSegment.push(points[i]);
    }
  }
  
  // Add the last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }
  
  return segments;
};

/**
 * Creates a bounds object that handles the antimeridian crossing properly
 * @param {number} lat1 - Origin latitude
 * @param {number} lng1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lng2 - Destination longitude
 * @returns {L.LatLngBounds} Properly adjusted bounds
 */
export const createCrossingAwareBounds = (lat1, lng1, lat2, lng2) => {
  // Check if this might be crossing the antimeridian
  const isLikelyCrossing = Math.abs(lng1 - lng2) > 180;
  
  if (isLikelyCrossing) {
    debugLog("BOUNDS", "Detected possible antimeridian crossing", { lng1, lng2 });
    
    // Adjust one of the longitudes to create proper bounds
    let adjustedLng1 = lng1;
    let adjustedLng2 = lng2;
    
    if (lng1 < 0 && lng2 > 0) {
      // If crossing from west to east, add 360 to the western longitude
      adjustedLng1 = lng1 + 360;
      debugLog("BOUNDS", "Adjusted western longitude", { original: lng1, adjusted: adjustedLng1 });
    } else if (lng1 > 0 && lng2 < 0) {
      // If crossing from east to west, add 360 to the eastern longitude
      adjustedLng2 = lng2 + 360;
      debugLog("BOUNDS", "Adjusted eastern longitude", { original: lng2, adjusted: adjustedLng2 });
    }
    
    // Create bounds with the adjusted coordinates
    return L.latLngBounds(
      L.latLng(lat1, adjustedLng1),
      L.latLng(lat2, adjustedLng2)
    );
  }
  
  // Regular bounds if not crossing antimeridian
  return L.latLngBounds(
    L.latLng(lat1, lng1),
    L.latLng(lat2, lng2)
  );
};

/**
 * Log the current map state including zoom level and bounds
 * @param {Object} mapInstance - Leaflet map instance
 * @param {string} context - Description of where this is being called from
 */
export const logMapState = (mapInstance, context = 'unknown') => {
  if (!mapInstance) {
    debugLog("MAP_DEBUG", `No map instance available (${context})`);
    return;
  }
  
  const zoom = mapInstance.getZoom();
  const center = mapInstance.getCenter();
  const bounds = mapInstance.getBounds();
  
  debugLog("MAP_DEBUG", `Map state (${context}):`, {
    zoom,
    center: [center.lat, center.lng],
    bounds: {
      northEast: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
      southWest: [bounds.getSouthWest().lat, bounds.getSouthWest().lng]
    }
  });
};

/**
 * Calculate the great circle distance between two points in kilometers
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

/**
 * Helper function for debugging map operations
 * @param {string} category - Category for the log message
 * @param {string} message - Message to log
 * @param {any} obj - Optional object to include in the log
 */
export const debugLog = (category, message, obj = null) => {
  console.log(`[${category}] ${message}`, obj || "");
  if (category === "ERROR") {
    console.error(`[${category}] ${message}`, obj || "");
  }
};
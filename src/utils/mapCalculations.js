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
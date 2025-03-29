import L from "leaflet";
import { getRouteColor } from "./styleUtils";

/**
 * Creates a custom icon for transportation markers
 * @param {string} type - Transportation type ('flight', 'train', etc.)
 * @param {boolean} isActive - Whether this marker is for an active segment
 * @returns {L.divIcon} Leaflet div icon
 */
export const createCustomIcon = (type, isActive = false) => {
  const color = getRouteColor(type);
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="
        background-color: ${color}; 
        width: ${isActive ? "20px" : "16px"}; 
        height: ${isActive ? "20px" : "16px"}; 
        border-radius: 50%; 
        border: ${isActive ? "3px" : "2px"} solid white;
        box-shadow: 0 0 3px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [isActive ? 26 : 20, isActive ? 26 : 20],
    iconAnchor: [isActive ? 13 : 10, isActive ? 13 : 10],
  });
};

/**
 * Creates a custom accommodation icon 
 * @param {boolean} isActive - Whether this marker is active
 * @returns {L.divIcon} Leaflet div icon
 */
export const createAccommodationIcon = (isActive = false) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="
        background-color: #8800ff; 
        width: ${isActive ? "24px" : "20px"}; 
        height: ${isActive ? "24px" : "20px"}; 
        border-radius: 50%; 
        border: ${isActive ? "3px" : "2px"} solid white;
        box-shadow: 0 0 3px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">H</div>
    `,
    iconSize: [isActive ? 30 : 24, isActive ? 30 : 24],
    iconAnchor: [isActive ? 15 : 12, isActive ? 15 : 12],
  });
};

/**
 * Creates multiple copies of a marker across world boundaries
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {L.icon} icon - Leaflet icon to use
 * @param {string} popupContent - HTML content for the popup
 * @param {L.layerGroup} layerGroup - Layer group to add the marker to
 */
export const createWorldCopiedMarker = (lat, lng, icon, popupContent, layerGroup) => {
  if (!layerGroup) return;
  
  // Create marker for primary world view and adjacent copies
  for (let worldCopy = -1; worldCopy <= 1; worldCopy++) {
    const lngOffset = worldCopy * 360;
    
    L.marker([lat, lng + lngOffset], {
      icon: icon,
      // Use non-wrapping for individual markers
      noWrap: true
    })
      .bindPopup(popupContent)
      .addTo(layerGroup);
  }
};

/**
 * Draws a flight path with a great circle line
 * @param {Object} flight - Flight object with origin and destination
 * @param {boolean} isActive - Whether this is an active segment
 * @param {L.layerGroup} layerGroup - Layer group to add the path to
 * @param {Function} calculateGreatCirclePolylines - Function to calculate great circle paths
 */
export const drawFlightPathWithGreatCircle = (flight, isActive, layerGroup, calculateGreatCirclePolylines) => {
  if (!layerGroup) return;

  const originLat = flight.origin.coordinates[0];
  const originLng = flight.origin.coordinates[1];
  const destLat = flight.destination.coordinates[0];
  const destLng = flight.destination.coordinates[1];

  const numPoints = 200; // Increased for smoother paths

  // Calculate the segments for the original path
  const segments = calculateGreatCirclePolylines(originLat, originLng, destLat, destLng, numPoints);

  // For each world copy (-1, 0, +1), draw the segments
  for (let worldCopy = -1; worldCopy <= 1; worldCopy++) {
    const lngOffset = worldCopy * 360;
    
    segments.forEach(pathPoints => {
      // Create a copy of the path with longitude offset
      const offsetPathPoints = pathPoints.map(([lat, lng]) => [lat, lng + lngOffset]);
      
      L.polyline(offsetPathPoints, {
        color: getRouteColor("flight"),
        weight: isActive ? 4 : 2,
        opacity: 0.7,
        dashArray: "10, 10",
        noWrap: true, // Use noWrap: true for the specific line
      })
        .bindPopup(`
          <b>${flight.transport}</b><br>
          From: ${flight.origin.name}<br>
          To: ${flight.destination.name}
        `)
        .addTo(layerGroup);
    });
  }
    
  // Always add markers - just make them larger if active
  // Origin marker
  createWorldCopiedMarker(
    originLat, 
    originLng, 
    createCustomIcon("flight", isActive),
    `<b>${flight.origin.name}</b>${flight.origin.code ? ` (${flight.origin.code})` : ""}`,
    layerGroup
  );
  
  // Destination marker
  createWorldCopiedMarker(
    destLat, 
    destLng, 
    createCustomIcon("flight", isActive),
    `<b>${flight.destination.name}</b>${flight.destination.code ? ` (${flight.destination.code})` : ""}`,
    layerGroup
  );
};
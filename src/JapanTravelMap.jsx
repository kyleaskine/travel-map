import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import _ from "lodash";
import { japanTripData } from "./japan-trip-data";

// Convert degrees to radians
const toRad = (deg) => (deg * Math.PI) / 180;
// Convert radians to degrees
const toDeg = (rad) => (rad * 180) / Math.PI;

// Improved great circle calculation that produces the correct northern path
const calculateGreatCirclePoints = (startLat, startLng, endLat, endLng, numPoints = 100) => {
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

// Get colors for different transportation types
const getRouteColor = (type) => {
  const colorMap = {
    flight: "#3388ff",
    train: "#ff3333",
    shuttle: "#33cc33",
    walk: "#ff9900",
    bus: "#9933cc",
  };
  return colorMap[type] || "#999999";
};

// Create custom icons for markers
const createCustomIcon = (type, isActive = false) => {
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

// Create accommodation icon
const createAccommodationIcon = (isActive = false) => {
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

// Helper function to create copies of markers across world boundaries
const createWorldCopiedMarker = (lat, lng, icon, popupContent, layerGroup) => {
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

// Split a great circle path into multiple segments at the antimeridian (IDL)
const calculateGreatCirclePolylines = (startLat, startLng, endLat, endLng, numPoints = 100) => {
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

// Helper function to draw flight path with improved great circle
const drawFlightPathWithGreatCircle = (flight, isActive, layerGroup) => {
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
    
    // Add markers if this is an active segment
    if (isActive) {
      // Origin marker
      createWorldCopiedMarker(
        originLat, 
        originLng, 
        createCustomIcon("flight", true),
        `<b>${flight.origin.name}</b>${flight.origin.code ? ` (${flight.origin.code})` : ""}`,
        layerGroup
      );
      
      // Destination marker
      createWorldCopiedMarker(
        destLat, 
        destLng, 
        createCustomIcon("flight", true),
        `<b>${flight.destination.name}</b>${flight.destination.code ? ` (${flight.destination.code})` : ""}`,
        layerGroup
      );
    }
  }
};

// Enhanced debugging helper
const debugLog = (category, message, obj = null) => {
  console.log(`[${category}] ${message}`, obj || "");
  if (category === "ERROR") {
    console.error(`[${category}] ${message}`, obj || "");
  }
};

const JapanTravelMap = () => {
  // Map and data state
  const mapContainerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [travelData, setTravelData] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);
  const [viewMode, setViewMode] = useState("japan");
  const [mapError, setMapError] = useState(null);
  const [mapStatus, setMapStatus] = useState("Initializing...");

  // Use a ref for layer groups so they persist between renders
  const layerGroups = useRef({
    flights: null,
    trains: null,
    shuttles: null,
    walks: null,
    buses: null,
    stays: null,
    active: null,
  });

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Track DOM rendering
  const [isContainerReady, setIsContainerReady] = useState(false);

  // Component lifecycle
  useEffect(() => {
    debugLog("LIFECYCLE", "JapanTravelMap component mounted");
    isMounted.current = true;

    return () => {
      debugLog("LIFECYCLE", "JapanTravelMap component unmounted");
      isMounted.current = false;

      // Clean up map instance and layer groups on unmount
      if (mapInstance) {
        debugLog("CLEANUP", "Removing map instance on unmount");
        // Clear layers before removing map
        Object.values(layerGroups.current).forEach((group) => {
          if (group) {
            try {
              group.clearLayers();
            } catch (e) {
              debugLog("ERROR", "Error clearing layer group", e);
            }
          }
        });

        // Reset layer groups ref
        layerGroups.current = {
          flights: null,
          trains: null,
          shuttles: null,
          walks: null,
          buses: null,
          stays: null,
          active: null,
        };

        try {
          mapInstance.remove();
        } catch (e) {
          debugLog("ERROR", "Error removing map instance", e);
        }
      }
    };
  }, [mapInstance]);

  // Initialize trip data
  useEffect(() => {
    try {
      debugLog("DATA", "Loading travel data");
      setTravelData(japanTripData);
    } catch (error) {
      debugLog("ERROR", "Failed to load travel data", error);
      setMapError("Failed to load travel data");
    }
  }, []);

  // Check if map container is ready after render
  useEffect(() => {
    const checkContainer = () => {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        debugLog("DOM", `Map container found: ${rect.width}x${rect.height}`);

        if (rect.width > 0 && rect.height > 0) {
          debugLog("DOM", "Container has valid dimensions, marking as ready");
          setIsContainerReady(true);
          return true;
        } else {
          debugLog("DOM", "Container has zero dimensions, forcing size");
          mapContainerRef.current.style.width = "100%";
          mapContainerRef.current.style.height = "500px";
          mapContainerRef.current.style.position = "relative";
          mapContainerRef.current.style.display = "block";
        }
      } else {
        debugLog("DOM", "Map container ref not available yet");
      }
      return false;
    };

    // Try immediately
    if (!checkContainer()) {
      // If not successful, try again after a delay
      const timer = setTimeout(() => {
        if (isMounted.current) {
          checkContainer();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // Initialize map once container is confirmed ready
  useEffect(() => {
    if (!isContainerReady) {
      debugLog("MAP_INIT", "Waiting for container to be ready");
      return;
    }

    if (mapInstance) {
      debugLog("MAP_INIT", "Map already initialized");
      return;
    }

    debugLog("MAP_INIT", "Container is ready, initializing map");
    setMapStatus("Creating map...");

    // Updated map initialization for better world wrapping
    try {
      // Create the map instance with improved options for world wrapping
      const newMap = L.map(mapContainerRef.current, {
        center: [30, 0],
        zoom: 2,
        worldCopyJump: true, // Helps keep focus when panning
        continuousWorld: true, // Ensures smooth map movement
        noWrap: false // Allows for full world wraparound
      });

      debugLog("MAP_INIT", "Map instance created successfully");

      // Add zoom control in a better position (top left but below the view buttons)
      L.control
        .zoom({
          position: "topleft",
        })
        .addTo(newMap);

      // Add multiple tile layer options
      const baseMaps = {
        Street: L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles &copy; Esri",
          }
        ).addTo(newMap),

        Terrain: L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles &copy; Esri",
          }
        ),

        Satellite: L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles &copy; Esri",
          }
        ),
      };

      // Add layer control in bottom left so it doesn't conflict with the legend
      L.control
        .layers(baseMaps, null, {
          position: "bottomleft",
        })
        .addTo(newMap);

      debugLog("MAP_INIT", "Tile layer and controls added");

      // Initialize layer groups
      layerGroups.current = {
        flights: L.layerGroup().addTo(newMap),
        trains: L.layerGroup().addTo(newMap),
        shuttles: L.layerGroup().addTo(newMap),
        walks: L.layerGroup().addTo(newMap),
        buses: L.layerGroup().addTo(newMap),
        stays: L.layerGroup().addTo(newMap),
        active: L.layerGroup().addTo(newMap),
      };

      debugLog("MAP_INIT", "Layer groups initialized");

      // Make sure the map knows its size
      newMap.invalidateSize(true);

      // Set map in state only when everything is ready
      setMapInstance(newMap);
      setMapStatus("Map ready");

      debugLog("MAP_INIT", "Map initialization complete");
    } catch (error) {
      debugLog("ERROR", "Failed to initialize map", error);
      setMapError(`Map initialization failed: ${error.message}`);
      setMapStatus("Error creating map");
    }
  }, [isContainerReady, mapInstance]);

  // Update map when data, view mode, or active segment changes
  useEffect(() => {
    if (!mapInstance || !travelData) {
      debugLog(
        "MAP_UPDATE",
        `Map or travel data not ready for update. Map: ${!!mapInstance}, Data: ${!!travelData}`
      );
      return;
    }

    debugLog(
      "MAP_UPDATE",
      `Updating map with travel data. View: ${viewMode}, Active segment: ${
        activeSegment?.id || "none"
      }`
    );

    try {
      // Check if layer groups need to be recreated
      if (
        !layerGroups.current.flights ||
        !layerGroups.current.trains ||
        !layerGroups.current.shuttles ||
        !layerGroups.current.walks ||
        !layerGroups.current.buses ||
        !layerGroups.current.stays ||
        !layerGroups.current.active
      ) {
        debugLog("MAP_UPDATE", "Layer groups missing, recreating them");

        // Recreate layer groups
        layerGroups.current = {
          flights: L.layerGroup().addTo(mapInstance),
          trains: L.layerGroup().addTo(mapInstance),
          shuttles: L.layerGroup().addTo(mapInstance),
          walks: L.layerGroup().addTo(mapInstance),
          buses: L.layerGroup().addTo(mapInstance),
          stays: L.layerGroup().addTo(mapInstance),
          active: L.layerGroup().addTo(mapInstance),
        };

        debugLog("MAP_UPDATE", "Layer groups recreated");
      }

      // Clear all layers
      Object.values(layerGroups.current).forEach((group) => {
        if (group) {
          try {
            group.clearLayers();
          } catch (e) {
            debugLog("ERROR", "Error clearing layer group", e);
          }
        }
      });

      // Apply view based on current mode
      if (viewMode === "world") {
        debugLog("MAP_UPDATE", "Setting world view");
        mapInstance.setView([30, 0], 2);

        // Add all airports for international flights
        const internationalFlights = travelData.segments.filter(
          (s) =>
            s.type === "flight" &&
            ((s.origin.code === "ORD" && s.destination.code === "NRT") ||
              (s.origin.code === "HND" && s.destination.code === "ORD"))
        );

        debugLog(
          "MAP_UPDATE",
          `Found ${internationalFlights.length} international flights`
        );

        // Add all unique airports
        const airports = [];
        internationalFlights.forEach((flight) => {
          airports.push(flight.origin);
          airports.push(flight.destination);
        });

        const uniqueAirports = _.uniqBy(
          airports,
          (airport) => `${airport.coordinates[0]},${airport.coordinates[1]}`
        );

        debugLog(
          "MAP_UPDATE",
          `Found ${uniqueAirports.length} unique airports`
        );

        // Add airport markers
        uniqueAirports.forEach((airport) => {
          if (layerGroups.current.flights) {
            createWorldCopiedMarker(
              airport.coordinates[0],
              airport.coordinates[1],
              createCustomIcon("flight"),
              `<b>${airport.name}</b>${
                airport.code ? ` (${airport.code})` : ""
              }`,
              layerGroups.current.flights
            );
          }
        });

        // Add flight routes with great circle paths
        internationalFlights.forEach((flight) => {
          const isActive = activeSegment && activeSegment.id === flight.id;
          const layerGroup = isActive
            ? layerGroups.current.active
            : layerGroups.current.flights;

          drawFlightPathWithGreatCircle(flight, isActive, layerGroup);
        });
      } else if (viewMode === "japan") {
        debugLog("MAP_UPDATE", "Setting Japan view");
        mapInstance.setView([36.5, 138.5], 6);

        // Filter segments in Japan
        const japanSegments = travelData.segments.filter(
          (s) =>
            s.origin.coordinates[0] > 30 &&
            s.origin.coordinates[0] < 46 &&
            s.origin.coordinates[1] > 127 &&
            s.origin.coordinates[1] < 146
        );

        debugLog(
          "MAP_UPDATE",
          `Found ${japanSegments.length} segments in Japan`
        );

        // Add all transport segments
        japanSegments.forEach((segment) => {
          const isActive = activeSegment && activeSegment.id === segment.id;
          const type = segment.type;

          if (type === "flight") {
            // Handle flights with great circle paths
            const layerGroup = isActive
              ? layerGroups.current.active
              : layerGroups.current.flights;

            drawFlightPathWithGreatCircle(segment, isActive, layerGroup);
          } else {
            // Handle other transport types with straight lines
            const layerGroup = isActive
              ? layerGroups.current.active
              : layerGroups.current[`${type}s`];

            if (layerGroup) {
              // For each world copy, draw the line
              for (let worldCopy = -1; worldCopy <= 1; worldCopy++) {
                const lngOffset = worldCopy * 360;
                
                // Line connecting origin and destination
                L.polyline(
                  [
                    [
                      segment.origin.coordinates[0],
                      segment.origin.coordinates[1] + lngOffset,
                    ],
                    [
                      segment.destination.coordinates[0],
                      segment.destination.coordinates[1] + lngOffset,
                    ],
                  ],
                  {
                    color: getRouteColor(type),
                    weight: isActive ? 4 : 2,
                    opacity: 0.7,
                    noWrap: true,
                  }
                )
                  .bindPopup(
                    `
                  <b>${segment.transport}</b><br>
                  From: ${segment.origin.name}<br>
                  To: ${segment.destination.name}
                `
                  )
                  .addTo(layerGroup);
              }

              // Add markers if active
              if (isActive) {
                // Origin marker
                createWorldCopiedMarker(
                  segment.origin.coordinates[0],
                  segment.origin.coordinates[1],
                  createCustomIcon(type, isActive),
                  `<b>${segment.origin.name}</b>${
                    segment.origin.code ? ` (${segment.origin.code})` : ""
                  }`,
                  layerGroup
                );

                // Destination marker
                createWorldCopiedMarker(
                  segment.destination.coordinates[0],
                  segment.destination.coordinates[1],
                  createCustomIcon(type, isActive),
                  `<b>${segment.destination.name}</b>${
                    segment.destination.code
                      ? ` (${segment.destination.code})`
                      : ""
                  }`,
                  layerGroup
                );
              }
            }
          }
        });

        // Add stay locations
        if (layerGroups.current.stays) {
          travelData.stays.forEach((stay) => {
            createWorldCopiedMarker(
              stay.coordinates[0],
              stay.coordinates[1],
              createAccommodationIcon(),
              `
                <b>${stay.location}</b><br>
                ${stay.notes}<br>
                ${stay.dateStart} to ${stay.dateEnd}
              `,
              layerGroups.current.stays
            );
          });
        }
      } else if (viewMode === "local" && activeSegment) {
        // Local view implementation
        debugLog("MAP_UPDATE", "Setting local view for active segment");

        // Find center point between origin and destination
        const originLat = activeSegment.origin.coordinates[0];
        const originLng = activeSegment.origin.coordinates[1];
        const destLat = activeSegment.destination.coordinates[0];
        const destLng = activeSegment.destination.coordinates[1];

        // Calculate center point
        const centerLat = (originLat + destLat) / 2;
        const centerLng = (originLng + destLng) / 2;

        // Calculate distance to determine appropriate zoom level
        const distance = Math.sqrt(
          Math.pow(originLat - destLat, 2) + Math.pow(originLng - destLng, 2)
        );

        // Better zoom calculation based on distance and transport type
        let zoom;

        if (activeSegment.type === "flight") {
          if (
            (activeSegment.origin.code === "ORD" &&
              activeSegment.destination.code === "NRT") ||
            (activeSegment.origin.code === "HND" &&
              activeSegment.destination.code === "ORD")
          ) {
            // International flights
            zoom = 3; // Fixed zoom for international flights
          } else {
            // Domestic flights
            zoom = 7; // Fixed zoom for domestic flights
          }
        } else if (activeSegment.type === "train" && distance > 0.5) {
          // Long train rides
          zoom = 8;
        } else if (
          activeSegment.type === "shuttle" ||
          activeSegment.type === "walk"
        ) {
          // Local transportation
          zoom = 12; // Very zoomed in for short distances
        } else {
          // Default for other transport types or edge cases
          zoom = 9;
        }

        debugLog(
          "MAP_UPDATE",
          `Setting zoom level ${zoom} for ${
            activeSegment.type
          } segment with distance ${distance.toFixed(4)}`
        );

        mapInstance.setView([centerLat, centerLng], zoom);

        // Draw active segment based on transportation type
        const type = activeSegment.type;

        if (type === "flight") {
          // For flights, use great circle paths
          drawFlightPathWithGreatCircle(
            activeSegment,
            true,
            layerGroups.current.active
          );
        } else if (layerGroups.current.active) {
          // For non-flight segments, use straight lines across all world copies
          for (let worldCopy = -1; worldCopy <= 1; worldCopy++) {
            const lngOffset = worldCopy * 360;
            
            // Line connecting origin and destination
            L.polyline(
              [
                [originLat, originLng + lngOffset],
                [destLat, destLng + lngOffset],
              ],
              {
                color: getRouteColor(type),
                weight: 4,
                opacity: 0.8,
                noWrap: true,
              }
            )
              .bindPopup(
                `
                <b>${activeSegment.transport}</b><br>
                From: ${activeSegment.origin.name}<br>
                To: ${activeSegment.destination.name}
              `
              )
              .addTo(layerGroups.current.active);
          }

          // Add markers with world copies
          // Origin marker
          createWorldCopiedMarker(
            originLat,
            originLng,
            createCustomIcon(type, true),
            `<b>${activeSegment.origin.name}</b>${
              activeSegment.origin.code
                ? ` (${activeSegment.origin.code})`
                : ""
            }`,
            layerGroups.current.active
          );

          // Destination marker
          createWorldCopiedMarker(
            destLat,
            destLng,
            createCustomIcon(type, true),
            `<b>${activeSegment.destination.name}</b>${
              activeSegment.destination.code
                ? ` (${activeSegment.destination.code})`
                : ""
            }`,
            layerGroups.current.active
          );
        }
      }

      // Ensure map is properly sized
      debugLog("MAP_UPDATE", "Updating map size");
      mapInstance.invalidateSize(true);
    } catch (error) {
      debugLog("ERROR", "Error updating map", error);
      setMapError(`Failed to update map: ${error.message}`);
    }
  }, [travelData, viewMode, activeSegment, mapInstance]);

  // Handler for timeline item click
  const handleTimelineItemClick = (segment) => {
    debugLog(
      "INTERACTION",
      `Timeline item clicked: ${segment.id} - ${segment.transport}`
    );
    setActiveSegment(segment);

    // Always set to local view for all segments
    setViewMode("local");
  };

  // Format date string
  const formatDate = (dateString) => {
    const options = { weekday: "short", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Group segments by date
  const getSegmentsByDate = () => {
    if (!travelData) return [];

    const grouped = _.groupBy(travelData.segments, "date");

    return Object.entries(grouped)
      .map(([date, segments]) => {
        const dateObj = new Date(date);
        return {
          date,
          dayOfWeek: dateObj.toLocaleDateString(undefined, {
            weekday: "short",
          }),
          dayOfMonth: dateObj.getDate(),
          month: dateObj.toLocaleDateString(undefined, { month: "short" }),
          segments,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Loading state handling
  if (!travelData) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f3f4f6",
        }}
      >
        Loading travel data...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#f3f4f6",
      }}
    >
      <header
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          padding: "1rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          {travelData ? travelData.tripName : "Japan Trip"}
        </h1>
        <p style={{ fontSize: "0.875rem" }}>Feb 16 - Feb 22, 2025</p>
        {!mapInstance && <p style={{ fontSize: "0.875rem" }}>{mapStatus}</p>}
      </header>

      <div style={{ display: "flex", flex: "1", overflow: "hidden" }}>
        {/* Timeline Sidebar */}
        {travelData ? (
          <div
            style={{
              width: "16rem",
              backgroundColor: "white",
              boxShadow: "4px 0 6px -1px rgba(0, 0, 0, 0.1)",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#f3f4f6",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <h2 style={{ fontWeight: "bold" }}>Travel Timeline</h2>
            </div>
            <div>
              {getSegmentsByDate().map((dayGroup) => (
                <div key={dayGroup.date} style={{ marginBottom: "0.5rem" }}>
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                      {dayGroup.dayOfWeek}, {dayGroup.month} {dayGroup.dayOfMonth}
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #f3f4f6" }}>
                    {dayGroup.segments.map((segment) => (
                      <div
                        key={segment.id}
                        style={{
                          padding: "0.75rem",
                          cursor: "pointer",
                          backgroundColor:
                            activeSegment && activeSegment.id === segment.id
                              ? "#ebf5ff"
                              : "transparent",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                        onClick={() => handleTimelineItemClick(segment)}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div
                            style={{
                              width: "0.75rem",
                              height: "0.75rem",
                              borderRadius: "9999px",
                              marginRight: "0.5rem",
                              flexShrink: 0,
                              backgroundColor: getRouteColor(segment.type),
                            }}
                          ></div>
                          <div
                            style={{
                              fontWeight: "500",
                              fontSize: "0.875rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {segment.transport}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            marginTop: "0.25rem",
                            marginLeft: "1.25rem",
                            color: "#4b5563",
                          }}
                        >
                          {segment.origin.name.length > 15
                            ? segment.origin.name.substring(0, 15) + "..."
                            : segment.origin.name}{" "}
                          →{" "}
                          {segment.destination.name.length > 15
                            ? segment.destination.name.substring(0, 15) + "..."
                            : segment.destination.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#f3f4f6",
                borderBottom: "1px solid #e5e7eb",
                marginTop: "1rem",
              }}
            >
              <h2 style={{ fontWeight: "bold" }}>Accommodations</h2>
            </div>
            <div>
              {travelData.stays.map((stay, index) => (
                <div
                  key={index}
                  style={{ padding: "0.75rem", borderBottom: "1px solid #f3f4eb" }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {formatDate(stay.dateStart)} - {formatDate(stay.dateEnd)}
                  </div>
                  <div style={{ fontWeight: "500", fontSize: "0.875rem" }}>
                    {stay.location}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      marginTop: "0.25rem",
                      color: "#4b5563",
                    }}
                  >
                    {stay.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              width: "16rem",
              backgroundColor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p>Loading timeline...</p>
          </div>
        )}

        {/* Map Area */}
        <div style={{ flex: "1", position: "relative" }}>
          {/* View controls - positioned higher up to avoid overlap with zoom controls */}
          <div
            style={{
              position: "absolute",
              top: "1rem", 
              left: "5rem", 
              zIndex: "10",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <button
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                backgroundColor: viewMode === "world" ? "#2563eb" : "white",
                color: viewMode === "world" ? "white" : "black",
              }}
              onClick={() => setViewMode("world")}
            >
              World View
            </button>
            <button
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                backgroundColor: viewMode === "japan" ? "#2563eb" : "white",
                color: viewMode === "japan" ? "white" : "black",
              }}
              onClick={() => setViewMode("japan")}
            >
              Japan View
            </button>
            {activeSegment && (
              <button
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  backgroundColor: viewMode === "local" ? "#2563eb" : "white",
                  color: viewMode === "local" ? "white" : "black",
                }}
                onClick={() => setViewMode("local")}
              >
                Segment Focus
              </button>
            )}
          </div>

          {/* Legend - positioned at the top right */}
          <div
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              backgroundColor: "white",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              zIndex: "10",
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              Transportation Types
            </div>
            {Object.entries({
              flight: "Flight",
              train: "Train",
              shuttle: "Shuttle",
              walk: "Walk",
              bus: "Bus",
            }).map(([type, label]) => (
              <div
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "0.25rem",
                }}
              >
                <div
                  style={{
                    width: "0.75rem",
                    height: "0.75rem",
                    borderRadius: "9999px",
                    marginRight: "0.5rem",
                    backgroundColor: getRouteColor(type),
                  }}
                ></div>
                <div style={{ fontSize: "0.75rem" }}>{label}</div>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "0.5rem",
              }}
            >
              <div
                style={{
                  width: "1rem",
                  height: "1rem",
                  backgroundColor: "#8800ff",
                  borderRadius: "9999px",
                  marginRight: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                  }}
                >
                  H
                </span>
              </div>
              <div style={{ fontSize: "0.75rem" }}>Accommodation</div>
            </div>
          </div>

          {/* Map error overlay */}
          {mapError && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(239, 68, 68, 0.9)",
                color: "white",
                padding: "1rem",
                borderRadius: "0.5rem",
                zIndex: "20",
                maxWidth: "80%",
                textAlign: "center",
              }}
            >
              <p>{mapError}</p>
              <button
                style={{
                  marginTop: "0.5rem",
                  padding: "0.25rem 0.75rem",
                  backgroundColor: "white",
                  color: "rgb(239, 68, 68)",
                  borderRadius: "0.25rem",
                  fontWeight: "bold",
                }}
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          )}

          {/* Map Container */}
          <div
            id="japan-travel-map"
            ref={mapContainerRef}
            data-testid="map-container"
            className="leaflet-container"
            style={{
              height: "100%",
              width: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#e5e7eb",
              zIndex: "1", // Lower z-index so controls appear above
            }}
          >
            {!isContainerReady && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  color: "#4b5563",
                }}
              >
                Preparing map...
              </div>
            )}
          </div>

          {/* Selected Segment Detail Panel */}
          {activeSegment && (
            <div
              style={{
                position: "absolute",
                bottom: "5rem", // Positioned higher up to avoid overlap
                right: "1rem",
                backgroundColor: "white",
                padding: "1rem",
                borderRadius: "0.5rem",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                maxWidth: "20rem",
                zIndex: "10",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <h3 style={{ fontWeight: "bold" }}>
                  {activeSegment.transport}
                </h3>
                <button
                  style={{ color: "#9ca3af", cursor: "pointer" }}
                  onClick={() => setActiveSegment(null)}
                >
                  ✕
                </button>
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                  {formatDate(activeSegment.date)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "1rem",
                      height: "1rem",
                      borderRadius: "9999px",
                      marginRight: "0.5rem",
                      backgroundColor: getRouteColor(activeSegment.type),
                    }}
                  ></div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      textTransform: "capitalize",
                    }}
                  >
                    {activeSegment.type}
                  </div>
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ fontSize: "0.875rem" }}>
                    <strong>From:</strong> {activeSegment.origin.name}
                    {activeSegment.origin.code &&
                      ` (${activeSegment.origin.code})`}
                  </div>
                  <div style={{ fontSize: "0.875rem" }}>
                    <strong>To:</strong> {activeSegment.destination.name}
                    {activeSegment.destination.code &&
                      ` (${activeSegment.destination.code})`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JapanTravelMap;
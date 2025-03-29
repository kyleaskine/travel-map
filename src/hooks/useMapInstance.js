import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { debugLog } from "../utils/mapCalculations";

/**
 * Custom hook to initialize and manage a Leaflet map instance
 * @param {Object} containerRef - React ref to the map container element
 * @param {boolean} isContainerReady - Whether the container is ready for map initialization
 * @returns {Object} Map instance and related state
 */
const useMapInstance = (containerRef, isContainerReady) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [mapStatus, setMapStatus] = useState("Initializing...");
  const initializationAttempted = useRef(false);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

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
    
    // Prevent multiple initialization attempts
    if (initializationAttempted.current) {
      debugLog("MAP_INIT", "Map initialization already attempted, skipping");
      return;
    }
    
    initializationAttempted.current = true;

    debugLog("MAP_INIT", "Container is ready, initializing map");
    setMapStatus("Creating map...");

    try {
      // Create the map instance with improved options for world wrapping
      const newMap = L.map(containerRef.current, {
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

      // Add layer control in bottom left
      L.control
        .layers(baseMaps, null, {
          position: "bottomleft",
        })
        .addTo(newMap);

      debugLog("MAP_INIT", "Tile layer and controls added");

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

    // Cleanup on unmount
    return () => {
      if (mapInstance && isMounted.current) {
        try {
          mapInstance.remove();
        } catch (e) {
          debugLog("ERROR", "Error removing map instance", e);
        }
      }
    };
  }, [isContainerReady, containerRef, mapInstance]);

  // Component lifecycle effect
  useEffect(() => {
    debugLog("LIFECYCLE", "Map hook mounted");
    isMounted.current = true;

    return () => {
      debugLog("LIFECYCLE", "Map hook unmounted");
      isMounted.current = false;
    };
  }, []);

  return {
    mapInstance,
    mapError,
    mapStatus,
    setMapError
  };
};

export default useMapInstance;

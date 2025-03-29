import { useRef, useEffect } from "react";
import L from "leaflet";
import { debugLog } from "../utils/mapCalculations";

/**
 * Custom hook to manage Leaflet layer groups for a map
 * @param {Object} mapInstance - Leaflet map instance
 * @returns {Object} Layer groups ref object
 */
const useMapLayers = (mapInstance) => {
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

  // Initialize layer groups when map is ready
  useEffect(() => {
    if (!mapInstance) {
      return;
    }

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
      debugLog("LAYERS", "Initializing layer groups");

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

      debugLog("LAYERS", "Layer groups initialized");
    }

    // Cleanup on unmount
    return () => {
      if (mapInstance) {
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
      }
    };
  }, [mapInstance]);

  /**
   * Clear all map layers
   */
  const clearAllLayers = () => {
    if (!mapInstance) return;
    
    Object.values(layerGroups.current).forEach((group) => {
      if (group) {
        try {
          group.clearLayers();
        } catch (e) {
          debugLog("ERROR", "Error clearing layer group", e);
        }
      }
    });
    
    debugLog("LAYERS", "All layers cleared");
  };

  return {
    layerGroups: layerGroups.current,
    clearAllLayers
  };
};

export default useMapLayers;
import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import useMapInstance from "../../hooks/useMapInstance";
import { mapContainerStyles } from "../../utils/styleUtils";
import { debugLog } from "../../utils/mapCalculations";

/**
 * MapContainer handles the creation and management of the Leaflet map
 */
const MapContainer = ({ 
  children, 
  onMapReady, 
  onMapError 
}) => {
  const mapContainerRef = useRef(null);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check if map container is ready after render with improved retry logic
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
          debugLog("DOM", `Container has zero dimensions, forcing size (retry: ${retryCount})`);
          // Apply explicit styles to ensure the container has dimensions
          mapContainerRef.current.style.width = "100%";
          mapContainerRef.current.style.height = "calc(100vh - 64px)"; // Account for header
          mapContainerRef.current.style.position = "relative";
          mapContainerRef.current.style.display = "block";
          mapContainerRef.current.style.overflow = "hidden";
          
          // Force a reflow
          void mapContainerRef.current.offsetHeight;
        }
      } else {
        debugLog("DOM", "Map container ref not available yet");
      }
      return false;
    };

    // Try immediately
    if (!checkContainer() && retryCount < 5) {
      // If not successful, try again with increasing delay
      const timer = setTimeout(() => {
        setRetryCount(prevCount => prevCount + 1);
        checkContainer();
      }, 300 * (retryCount + 1)); // Increasing backoff
      
      return () => clearTimeout(timer);
    }
  }, [retryCount]);

  // Initialize the map
  const { mapInstance, mapError } = useMapInstance(
    mapContainerRef, 
    isContainerReady
  );

  // Pass map instance up to parent when ready
  useEffect(() => {
    if (mapInstance) {
      debugLog("MAP_INSTANCE", "Map instance ready, calling onMapReady");
      onMapReady(mapInstance);
    }
  }, [mapInstance, onMapReady]);

  // Pass map errors up to parent
  useEffect(() => {
    if (mapError) {
      onMapError(mapError);
    }
  }, [mapError, onMapError]);

  return (
    <div
      id="japan-travel-map"
      ref={mapContainerRef}
      data-testid="map-container"
      className="leaflet-container"
      style={{
        ...mapContainerStyles.container,
        height: "calc(100vh - 64px)" // Explicit height to match wrapper
      }}
    >
      {!isContainerReady && (
        <div style={mapContainerStyles.loadingOverlay}>
          Preparing map...
        </div>
      )}
      
      {/* Pass any child components to be rendered over the map */}
      {mapInstance && children}
    </div>
  );
};

MapContainer.propTypes = {
  children: PropTypes.node,
  onMapReady: PropTypes.func.isRequired,
  onMapError: PropTypes.func.isRequired
};

export default MapContainer;
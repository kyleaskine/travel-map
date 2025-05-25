import { useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import {
  debugLog,
  calculateGreatCirclePolylines,
  createCrossingAwareBounds,
  logMapState,
  calculateDistance,
} from "../../utils/mapCalculations";
import {
  createWorldCopiedMarker,
  createCustomIcon,
  createAccommodationIcon,
  drawFlightPathWithGreatCircle,
} from "../../utils/markerUtils";
import { getRouteColor } from "../../utils/styleUtils";

/**
 * MapRenderer component handles all map rendering logic
 * Extracted from the main TravelMap component
 */
const MapRenderer = ({
  mapInstance,
  travelData,
  layerGroups,
  viewMode,
  displayItem,
  lastFitBoundsTime,
  setLastFitBoundsTime,
  lastFitBoundsSegmentId,
  setLastFitBoundsSegmentId,
  clearAllLayers
}) => {
  const isRenderingRef = useRef(false);

  // Helper function to render flights
  const renderFlights = useCallback((flights, isWorldView = false) => {
    flights.forEach((flight) => {
      const isActive = displayItem && displayItem.id === flight.id;
      const layerGroup = isActive ? layerGroups.active : layerGroups.flights;

      drawFlightPathWithGreatCircle(
        flight,
        isActive,
        layerGroup,
        calculateGreatCirclePolylines
      );
    });
  }, [displayItem, layerGroups]);

  // Helper function to render non-flight segments
  const renderSegment = useCallback((segment, isActive) => {
    const type = segment.type;
    const layerGroup = isActive ? layerGroups.active : layerGroups[`${type}s`];

    if (!layerGroup) return;

    // Draw lines for each world copy
    for (let worldCopy = -1; worldCopy <= 1; worldCopy++) {
      const lngOffset = worldCopy * 360;

      L.polyline(
        [
          [segment.origin.coordinates[0], segment.origin.coordinates[1] + lngOffset],
          [segment.destination.coordinates[0], segment.destination.coordinates[1] + lngOffset],
        ],
        {
          color: getRouteColor(type),
          weight: isActive ? 4 : 2,
          opacity: 0.7,
          noWrap: true,
        }
      )
        .bindPopup(`
          <b>${segment.transport}</b><br>
          From: ${segment.origin.name}<br>
          To: ${segment.destination.name}
        `)
        .addTo(layerGroup);
    }

    // Add markers
    createWorldCopiedMarker(
      segment.origin.coordinates[0],
      segment.origin.coordinates[1],
      createCustomIcon(type, isActive),
      `<b>${segment.origin.name}</b>${segment.origin.code ? ` (${segment.origin.code})` : ""}`,
      layerGroup
    );

    createWorldCopiedMarker(
      segment.destination.coordinates[0],
      segment.destination.coordinates[1],
      createCustomIcon(type, isActive),
      `<b>${segment.destination.name}</b>${segment.destination.code ? ` (${segment.destination.code})` : ""}`,
      layerGroup
    );
  }, [layerGroups]);

  // Helper function to render accommodations
  const renderAccommodations = useCallback((stays) => {
    stays.forEach((stay) => {
      const stayId = stay._id || `stay-${stay.location.replace(/\s+/g, "-").toLowerCase()}`;
      const isActive = displayItem && (displayItem._id === stay._id || displayItem.id === stayId);
      const iconToUse = isActive ? createAccommodationIcon(true) : createAccommodationIcon();

      createWorldCopiedMarker(
        stay.coordinates[0],
        stay.coordinates[1],
        iconToUse,
        `
          <b>${stay.location}</b><br>
          ${stay.notes || ""}<br>
          ${stay.dateStart} to ${stay.dateEnd}
        `,
        isActive ? layerGroups.active : layerGroups.stays
      );
    });
  }, [displayItem, layerGroups]);

  // Helper function to fit bounds for a segment
  const fitBoundsForSegment = useCallback((segment) => {
    const originLat = segment.origin.coordinates[0];
    const originLng = segment.origin.coordinates[1];
    const destLat = segment.destination.coordinates[0];
    const destLng = segment.destination.coordinates[1];

    const distanceKm = calculateDistance(originLat, originLng, destLat, destLng);
    debugLog("MAP_UPDATE", `Segment distance: ${distanceKm.toFixed(2)} km`);

    if (segment.type === "flight") {
      const bounds = createCrossingAwareBounds(originLat, originLng, destLat, destLng);
      const isInternationalFlight =
        (segment.origin.code === "ORD" && segment.destination.code === "NRT") ||
        (segment.origin.code === "HND" && segment.destination.code === "ORD");

      mapInstance.fitBounds(bounds, {
        padding: isInternationalFlight ? [100, 100] : [50, 50],
        maxZoom: isInternationalFlight ? 3 : 7,
        animate: true,
      });
    } else {
      const bounds = L.latLngBounds(
        L.latLng(originLat, originLng),
        L.latLng(destLat, destLng)
      );

      const now = Date.now();
      const isRecentFitBounds = now - lastFitBoundsTime < 1000 && lastFitBoundsSegmentId === segment.id;
      const currentZoom = mapInstance.getZoom();
      const targetZoom = segment.type === "walk" || segment.type === "shuttle" ? 14 : 10;
      const isAlreadyZoomed = Math.abs(currentZoom - targetZoom) <= 1;

      if (!isRecentFitBounds || !isAlreadyZoomed) {
        const padding = segment.type === "walk" || segment.type === "shuttle" ? [100, 100] : [50, 50];
        const maxZoom = segment.type === "walk" || segment.type === "shuttle" ? 14 : 10;
        const minZoom = segment.type === "walk" || segment.type === "shuttle" ? 12 : 8;

        mapInstance.fitBounds(bounds, { padding, maxZoom, minZoom, animate: true });
        setLastFitBoundsTime(now);
        setLastFitBoundsSegmentId(segment.id);
      }
    }

    setTimeout(() => {
      logMapState(mapInstance, `After fitBounds for ${segment.type}`);
    }, 100);
  }, [mapInstance, lastFitBoundsTime, lastFitBoundsSegmentId, setLastFitBoundsTime, setLastFitBoundsSegmentId]);

  // Helper function to fit bounds for accommodation
  const fitBoundsForAccommodation = useCallback((stay) => {
    const lat = stay.coordinates[0];
    const lng = stay.coordinates[1];

    const bounds = L.latLngBounds(
      L.latLng(lat - 0.009, lng - 0.009),
      L.latLng(lat + 0.009, lng + 0.009)
    );

    mapInstance.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
      animate: true,
    });
  }, [mapInstance]);

  // Main render function
  const render = useCallback(() => {
    if (!mapInstance || !travelData || !layerGroups) {
      debugLog("MAP_UPDATE", "Map or travel data not ready for update");
      return;
    }

    if (isRenderingRef.current) {
      debugLog("MAP_UPDATE", "Skipping render due to active rendering");
      return;
    }

    isRenderingRef.current = true;

    try {
      clearAllLayers();

      if (viewMode === "world") {
        debugLog("MAP_UPDATE", "Setting world view");
        mapInstance.setView([30, 0], 2);

        // Render international flights
        const internationalFlights = travelData.segments.filter(
          (s) =>
            s.type === "flight" &&
            ((s.origin.code === "ORD" && s.destination.code === "NRT") ||
              (s.origin.code === "HND" && s.destination.code === "ORD"))
        );

        renderFlights(internationalFlights, true);
        renderAccommodations(travelData.stays);

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

        // Render all segments
        japanSegments.forEach((segment) => {
          const isActive = displayItem && displayItem.id === segment.id;
          
          if (segment.type === "flight") {
            renderFlights([segment]);
          } else {
            renderSegment(segment, isActive);
          }
        });

        renderAccommodations(travelData.stays);

      } else if (viewMode === "local" && displayItem) {
        debugLog("MAP_UPDATE", "Setting local view for active/focused item");

        if (displayItem.itemType === "segment") {
          fitBoundsForSegment(displayItem);
          
          if (displayItem.type === "flight") {
            renderFlights([displayItem]);
          } else {
            renderSegment(displayItem, true);
          }
        } else if (displayItem.itemType === "stay") {
          fitBoundsForAccommodation(displayItem);
          renderAccommodations([displayItem]);

          // Show nearby segments
          const nearbySegments = travelData.segments.filter((segment) => {
            const lat = displayItem.coordinates[0];
            const lng = displayItem.coordinates[1];
            
            const isOriginClose =
              Math.abs(segment.origin.coordinates[0] - lat) < 0.01 &&
              Math.abs(segment.origin.coordinates[1] - lng) < 0.01;

            const isDestinationClose =
              Math.abs(segment.destination.coordinates[0] - lat) < 0.01 &&
              Math.abs(segment.destination.coordinates[1] - lng) < 0.01;

            return isOriginClose || isDestinationClose;
          });

          nearbySegments.forEach((segment) => {
            if (segment.type === "flight") {
              renderFlights([segment]);
            } else {
              renderSegment(segment, false);
            }
          });
        }
      }

      mapInstance.invalidateSize(true);
    } catch (error) {
      debugLog("ERROR", "Error updating map", error);
    } finally {
      setTimeout(() => {
        isRenderingRef.current = false;
      }, 100);
    }
  }, [
    mapInstance,
    travelData,
    layerGroups,
    viewMode,
    displayItem,
    clearAllLayers,
    renderFlights,
    renderSegment,
    renderAccommodations,
    fitBoundsForSegment,
    fitBoundsForAccommodation
  ]);

  // Render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  return null; // This component doesn't render anything visible
};

MapRenderer.propTypes = {
  mapInstance: PropTypes.object,
  travelData: PropTypes.object,
  layerGroups: PropTypes.object,
  viewMode: PropTypes.string,
  displayItem: PropTypes.object,
  lastFitBoundsTime: PropTypes.number,
  setLastFitBoundsTime: PropTypes.func,
  lastFitBoundsSegmentId: PropTypes.string,
  setLastFitBoundsSegmentId: PropTypes.func,
  clearAllLayers: PropTypes.func
};

export default MapRenderer;
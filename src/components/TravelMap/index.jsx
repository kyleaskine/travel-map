import React, { useState, useEffect, useCallback, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import _ from "lodash";
import TripAPI from "../../services/tripApi";
import { headerStyles, loadingStyles } from "../../utils/styleUtils";
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
import { formatDate } from "../../utils/dateUtils";

// Components
import MapContainer from "./MapContainer";
import TimelinePanel from "./TimelinePanel";
import ViewControls from "./ViewControls";
import MapLegend from "./MapLegend";
import SegmentDetail from "./SegmentDetail";
import AccommodationDetail from "./AccommodationDetail";
import ErrorMessage from "../common/ErrorMessage";
import TripSelector from "./TripSelector";
import AlbumOverlay from "./AlbumOverlay"; // Import the new AlbumOverlay component

// Custom hooks
import useMapLayers from "../../hooks/useMapLayers";

/**
 * TravelMap is the main component for the travel map application
 */
const TravelMap = () => {
  // Application state
  const [travelData, setTravelData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [viewMode, setViewMode] = useState("japan");
  const [mapError, setMapError] = useState(null);
  const [lastFitBoundsTime, setLastFitBoundsTime] = useState(0);
  const [lastFitBoundsSegmentId, setLastFitBoundsSegmentId] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [availableTrips, setAvailableTrips] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Album overlay state
  const [albumOpen, setAlbumOpen] = useState(false);
  const [albumItem, setAlbumItem] = useState(null);

  // Add a rendering lock to prevent duplicate updates
  const isRenderingRef = useRef(false);

  // Initialize map layers when map is ready
  const { layerGroups, clearAllLayers } = useMapLayers(mapInstance);

  // Function to refresh trip data from the server
  const refreshTripData = useCallback(async () => {
    if (selectedTripId) {
      try {
        setIsRefreshing(true);
        debugLog("DATA", "Refreshing trip data from API");
        
        const refreshedTrip = await TripAPI.getTripById(selectedTripId);
        setTravelData(refreshedTrip);
        
        // Update active/focused items with fresh data if they exist
        if (activeItem) {
          // For segments
          if (activeItem.itemType === 'segment') {
            const updatedSegment = refreshedTrip.segments.find(s => s.id === activeItem.id);
            if (updatedSegment) {
              setActiveItem({
                ...updatedSegment,
                itemType: 'segment'
              });
            }
          } 
          // For stays
          else if (activeItem.itemType === 'stay') {
            const stayId = activeItem.id || `stay-${activeItem.location.replace(/\s+/g, '-').toLowerCase()}`;
            const updatedStay = refreshedTrip.stays.find(s => {
              const compareId = `stay-${s.location.replace(/\s+/g, '-').toLowerCase()}`;
              return s._id === activeItem._id || compareId === stayId;
            });
            
            if (updatedStay) {
              setActiveItem({
                ...updatedStay,
                itemType: 'stay',
                id: updatedStay._id || `stay-${updatedStay.location.replace(/\s+/g, '-').toLowerCase()}`
              });
            }
          }
        }
        
        // Similarly update focused item if it exists
        if (focusedItem) {
          // Similar logic as above for focused item
        }
        
        debugLog("DATA", "Trip data refreshed successfully");
      } catch (error) {
        console.error("Failed to refresh trip data:", error);
        debugLog("ERROR", "Failed to refresh trip data", error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [selectedTripId, activeItem, focusedItem]);

  /**
   * Enhanced handleItemUpdate function to ensure media updates are properly propagated
   * @param {Object} updatedItem - Item with updated properties
   */
  const handleItemUpdate = async (updatedItem) => {
    // Make a copy of the travel data
    const updatedTravelData = {...travelData};
    
    // Check if it's a segment or stay
    if (updatedItem.itemType === 'segment' || updatedItem.type) {
      // It's a segment
      const segmentIndex = updatedTravelData.segments.findIndex(
        s => s.id === updatedItem.id
      );
      
      if (segmentIndex !== -1) {
        // Update the segment
        updatedTravelData.segments[segmentIndex] = {
          ...updatedTravelData.segments[segmentIndex],
          ...updatedItem
        };
        console.log(`Updated segment: ${updatedItem.transport || updatedItem.id}`);
        
        // If we're updating the active item, update that too
        if (activeItem && activeItem.id === updatedItem.id) {
          setActiveItem({
            ...activeItem,
            ...updatedItem
          });
        }
        
        // If we're updating the focused item, update that too
        if (focusedItem && focusedItem.id === updatedItem.id) {
          setFocusedItem({
            ...focusedItem,
            ...updatedItem
          });
        }
        
        // Sync with server
        try {
          await TripAPI.updateTrip(travelData._id, {
            segments: updatedTravelData.segments
          });
          console.log('Trip updated on server');
          
          // Refresh data from server to ensure consistency
          await refreshTripData();
        } catch (err) {
          console.error('Failed to update trip on server:', err);
        }
      }
    } else {
      // It's a stay
      const stayId = updatedItem._id || updatedItem.id || `stay-${updatedItem.location.replace(/\s+/g, '-').toLowerCase()}`;
      const stayName = stayId.replace('stay-', '').replace(/-/g, ' ');
      
      const stayIndex = updatedTravelData.stays.findIndex(s => 
        s._id === updatedItem._id || 
        s.location.toLowerCase() === stayName.toLowerCase()
      );
      
      if (stayIndex !== -1) {
        // Update the stay
        updatedTravelData.stays[stayIndex] = {
          ...updatedTravelData.stays[stayIndex],
          ...updatedItem
        };
        console.log(`Updated stay: ${updatedItem.location}`);
        
        // If we're updating the active item, update that too
        if (activeItem && (activeItem._id === updatedItem._id || activeItem.id === stayId)) {
          setActiveItem({
            ...activeItem,
            ...updatedItem
          });
        }
        
        // If we're updating the focused item, update that too
        if (focusedItem && (focusedItem._id === updatedItem._id || focusedItem.id === stayId)) {
          setFocusedItem({
            ...focusedItem,
            ...updatedItem
          });
        }
        
        // Sync with server
        try {
          await TripAPI.updateTrip(travelData._id, {
            stays: updatedTravelData.stays
          });
          console.log('Trip updated on server');
          
          // Refresh data from server to ensure consistency
          await refreshTripData();
        } catch (err) {
          console.error('Failed to update trip on server:', err);
        }
      }
    }
    
    // Update the state
    setTravelData(updatedTravelData);
  };

  // Fetch trips from API
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setIsLoading(true);
        debugLog("DATA", "Fetching trips from API");
        
        // Fetch all available trips
        const trips = await TripAPI.getAllTrips();
        setAvailableTrips(trips);
        
        // If we have trips, select the first one or use the selectedTripId if available
        if (trips.length > 0) {
          const tripId = selectedTripId || trips[0]._id;
          setSelectedTripId(tripId);
          
          // Fetch the selected trip data
          const selectedTrip = await TripAPI.getTripById(tripId);
          setTravelData(selectedTrip);
          debugLog("DATA", "Trip data loaded successfully");
        } else {
          setMapError("No trips available. Please create a trip first.");
        }
      } catch (error) {
        debugLog("ERROR", "Failed to load travel data", error);
        setMapError(`Failed to load travel data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, [selectedTripId]);

  // Handle map being ready - initial setup
  const handleMapReady = useCallback(
    (map) => {
      // If we already have a map instance, this is a duplicate call
      if (mapInstance) {
        debugLog("MAP_INIT", "Duplicate map ready call detected, ignoring");
        return;
      }

      debugLog("MAP_INIT", "Map is ready, setting initial view");
      setMapInstance(map);

      // Set the initial view for Japan
      map.setView([36.5, 138.5], 6);
    },
    [mapInstance]
  );

  // Function to render data on the map - extracted for reusability
  const renderMapData = useCallback(() => {
    if (!mapInstance || !travelData || !layerGroups) {
      debugLog(
        "MAP_UPDATE",
        `Map or travel data not ready for update. Map: ${!!mapInstance}, Data: ${!!travelData}, Layers: ${!!layerGroups}`
      );
      return;
    }

    // Set rendering lock to prevent duplicate renders
    if (isRenderingRef.current) {
      debugLog("MAP_UPDATE", "Skipping renderMapData due to active rendering");
      return;
    }

    isRenderingRef.current = true;

    // Use either the active item or the focused item for the map display
    const displayItem = activeItem || focusedItem;

    debugLog(
      "MAP_UPDATE",
      `Updating map with travel data. View: ${viewMode}, Display item: ${
        displayItem?.id || "none"
      }, Type: ${displayItem?.itemType || "none"}`
    );

    try {
      // Clear all layers before updating
      clearAllLayers();

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
          if (layerGroups.flights) {
            createWorldCopiedMarker(
              airport.coordinates[0],
              airport.coordinates[1],
              createCustomIcon("flight"),
              `<b>${airport.name}</b>${
                airport.code ? ` (${airport.code})` : ""
              }`,
              layerGroups.flights
            );
          }
        });

        // Add flight routes with great circle paths
        internationalFlights.forEach((flight) => {
          const isActive = displayItem && displayItem.id === flight.id;
          const layerGroup = isActive
            ? layerGroups.active
            : layerGroups.flights;

          drawFlightPathWithGreatCircle(
            flight,
            isActive,
            layerGroup,
            calculateGreatCirclePolylines
          );
        });

        // Add accommodations in world view too
        if (layerGroups.stays) {
          travelData.stays.forEach((stay) => {
            const stayId = stay._id || `stay-${stay.location
              .replace(/\s+/g, "-")
              .toLowerCase()}`;
            const isActive = displayItem && (displayItem._id === stay._id || displayItem.id === stayId);
            const iconToUse = isActive
              ? createAccommodationIcon(true)
              : createAccommodationIcon();

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
        }
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
          const isActive = displayItem && displayItem.id === segment.id;
          const type = segment.type;

          if (type === "flight") {
            // Handle flights with great circle paths
            const layerGroup = isActive
              ? layerGroups.active
              : layerGroups.flights;

            drawFlightPathWithGreatCircle(
              segment,
              isActive,
              layerGroup,
              calculateGreatCirclePolylines
            );
          } else {
            // Handle other transport types with straight lines
            const layerGroup = isActive
              ? layerGroups.active
              : layerGroups[`${type}s`];

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

              // Add markers for all segments (not just active ones)
              // Just make active ones larger
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
        });

        // Add stay locations
        if (layerGroups.stays) {
          travelData.stays.forEach((stay) => {
            const stayId = stay._id || `stay-${stay.location
              .replace(/\s+/g, "-")
              .toLowerCase()}`;
            const isActive = displayItem && (displayItem._id === stay._id || displayItem.id === stayId);
            const iconToUse = isActive
              ? createAccommodationIcon(true)
              : createAccommodationIcon();

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
        }
      } else if (viewMode === "local" && displayItem) {
        // Local view implementation for either segment or accommodation
        debugLog("MAP_UPDATE", "Setting local view for active/focused item");

        if (displayItem.itemType === "segment") {
          // For segments, use fitBounds instead of manually setting zoom
          const segment = displayItem;
          const originLat = segment.origin.coordinates[0];
          const originLng = segment.origin.coordinates[1];
          const destLat = segment.destination.coordinates[0];
          const destLng = segment.destination.coordinates[1];

          // Calculate and log the actual distance for debugging
          const distanceKm = calculateDistance(
            originLat,
            originLng,
            destLat,
            destLng
          );
          debugLog(
            "MAP_UPDATE",
            `Segment distance: ${distanceKm.toFixed(2)} km`
          );

          // Log map state before updating
          logMapState(mapInstance, `Before fitBounds for ${segment.type}`);

          // Special handling for different segment types
          if (segment.type === "flight") {
            // Create bounds that handle antimeridian crossing
            const bounds = createCrossingAwareBounds(
              originLat,
              originLng,
              destLat,
              destLng
            );

            // Check if this is an international flight
            const isInternationalFlight =
              (segment.origin.code === "ORD" &&
                segment.destination.code === "NRT") ||
              (segment.origin.code === "HND" &&
                segment.destination.code === "ORD");

            if (isInternationalFlight) {
              // For international flights
              mapInstance.fitBounds(bounds, {
                padding: [100, 100],
                maxZoom: 3,
                animate: true,
              });
              debugLog(
                "MAP_UPDATE",
                `Using fitBounds for international flight ${segment.id}`
              );
            } else {
              // For domestic flights
              mapInstance.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 7,
                animate: true,
              });
              debugLog(
                "MAP_UPDATE",
                `Using fitBounds for domestic flight ${segment.id}`
              );
            }
          } else {
            // For non-flight segments (train, shuttle, walk, bus)
            const bounds = L.latLngBounds(
              L.latLng(originLat, originLng),
              L.latLng(destLat, destLng)
            );

            // Get current time for debouncing
            const now = Date.now();
            const isRecentFitBounds =
              now - lastFitBoundsTime < 1000 &&
              lastFitBoundsSegmentId === segment.id;

            // Check if current zoom is already in appropriate range
            const currentZoom = mapInstance.getZoom();
            const targetZoom =
              segment.type === "walk" || segment.type === "shuttle" ? 14 : 10;
            const isAlreadyZoomed = Math.abs(currentZoom - targetZoom) <= 1;

            // Only apply fitBounds if not recent fit on same segment or zoom is far off
            if (!isRecentFitBounds || !isAlreadyZoomed) {
              debugLog(
                "MAP_UPDATE",
                `Applying fitBounds with target zoom ${targetZoom}`
              );

              // Different padding and max zoom for different transport types
              if (segment.type === "walk" || segment.type === "shuttle") {
                // For short-distance transport
                mapInstance.fitBounds(bounds, {
                  padding: [100, 100],
                  maxZoom: 14,
                  minZoom: 12, // Add minZoom to prevent zooming out too far
                  animate: true,
                });
              } else {
                // For train, bus, etc.
                mapInstance.fitBounds(bounds, {
                  padding: [50, 50],
                  maxZoom: 10,
                  minZoom: 8, // Add minZoom to prevent zooming out too far
                  animate: true,
                });
              }

              // Update the last fit bounds time and segment
              setLastFitBoundsTime(now);
              setLastFitBoundsSegmentId(segment.id);
            } else {
              debugLog(
                "MAP_UPDATE",
                `Skipping fitBounds - recent operation or already at correct zoom`
              );
            }
          }

          // Log map state after updating (with small delay to ensure bounds are applied)
          setTimeout(() => {
            logMapState(mapInstance, `After fitBounds for ${segment.type}`);
          }, 100);

          // Draw active segment based on transportation type
          const segmentType = segment.type;

          if (segmentType === "flight") {
            // For flights, use great circle paths
            drawFlightPathWithGreatCircle(
              segment,
              true,
              layerGroups.active,
              calculateGreatCirclePolylines
            );
          } else if (layerGroups.active) {
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
                  color: getRouteColor(segmentType),
                  weight: 4,
                  opacity: 0.8,
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
                .addTo(layerGroups.active);
            }

            // Add markers with world copies
            // Origin marker
            createWorldCopiedMarker(
              originLat,
              originLng,
              createCustomIcon(segmentType, true),
              `<b>${segment.origin.name}</b>${
                segment.origin.code ? ` (${segment.origin.code})` : ""
              }`,
              layerGroups.active
            );

            // Destination marker
            createWorldCopiedMarker(
              destLat,
              destLng,
              createCustomIcon(segmentType, true),
              `<b>${segment.destination.name}</b>${
                segment.destination.code ? ` (${segment.destination.code})` : ""
              }`,
              layerGroups.active
            );
          }
        } else if (displayItem.itemType === "stay") {
          // For accommodations, create a small bounds around the point
          const stay = displayItem;
          const lat = stay.coordinates[0];
          const lng = stay.coordinates[1];

          // Log map state before updating
          logMapState(mapInstance, `Before fitBounds for accommodation`);

          // Create a small bounds around the point (approx 1km in each direction)
          const bounds = L.latLngBounds(
            L.latLng(lat - 0.009, lng - 0.009), // Approx 1km south/west
            L.latLng(lat + 0.009, lng + 0.009) // Approx 1km north/east
          );

          // Fit the map to these bounds
          mapInstance.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15,
            animate: true,
          });

          // Log map state after updating
          setTimeout(() => {
            logMapState(mapInstance, `After fitBounds for accommodation`);
          }, 100);

          debugLog(
            "MAP_UPDATE",
            `Using fitBounds for accommodation ${stay.location}`
          );

          // Add accommodation marker
          createWorldCopiedMarker(
            lat,
            lng,
            createAccommodationIcon(true),
            `
              <b>${stay.location}</b><br>
              ${stay.notes || ""}<br>
              ${stay.dateStart} to ${stay.dateEnd}
            `,
            layerGroups.active
          );

          // Show any nearby transportation segments as well
          // Find segments that start or end near this accommodation (within ~1km)
          const nearbySegments = travelData.segments.filter((segment) => {
            // Check if origin or destination is close to this accommodation
            const isOriginClose =
              Math.abs(segment.origin.coordinates[0] - lat) < 0.01 &&
              Math.abs(segment.origin.coordinates[1] - lng) < 0.01;

            const isDestinationClose =
              Math.abs(segment.destination.coordinates[0] - lat) < 0.01 &&
              Math.abs(segment.destination.coordinates[1] - lng) < 0.01;

            return isOriginClose || isDestinationClose;
          });

          // Draw nearby segments
          nearbySegments.forEach((segment) => {
            const segmentType = segment.type;

            if (segmentType === "flight") {
              drawFlightPathWithGreatCircle(
                segment,
                false,
                layerGroups[`${segmentType}s`],
                calculateGreatCirclePolylines
              );
            } else {
              const layerGroup = layerGroups[`${segmentType}s`];
              if (layerGroup) {
                // Draw the line
                L.polyline(
                  [segment.origin.coordinates, segment.destination.coordinates],
                  {
                    color: getRouteColor(segmentType),
                    weight: 2,
                    opacity: 0.7,
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

                // Add origin marker if not at the accommodation
                if (
                  !(
                    Math.abs(segment.origin.coordinates[0] - lat) < 0.01 &&
                    Math.abs(segment.origin.coordinates[1] - lng) < 0.01
                  )
                ) {
                  createWorldCopiedMarker(
                    segment.origin.coordinates[0],
                    segment.origin.coordinates[1],
                    createCustomIcon(segmentType),
                    `<b>${segment.origin.name}</b>`,
                    layerGroup
                  );
                }

                // Add destination marker if not at the accommodation
                if (
                  !(
                    Math.abs(segment.destination.coordinates[0] - lat) < 0.01 &&
                    Math.abs(segment.destination.coordinates[1] - lng) < 0.01
                  )
                ) {
                  createWorldCopiedMarker(
                    segment.destination.coordinates[0],
                    segment.destination.coordinates[1],
                    createCustomIcon(segmentType),
                    `<b>${segment.destination.name}</b>`,
                    layerGroup
                  );
                }
              }
            }
          });
        }
      }

      // Ensure map is properly sized
      debugLog("MAP_UPDATE", "Updating map size");
      mapInstance.invalidateSize(true);
    } catch (error) {
      debugLog("ERROR", "Error updating map", error);
      setMapError(`Failed to update map: ${error.message}`);
    } finally {
      // Release the rendering lock after a short delay
      setTimeout(() => {
        isRenderingRef.current = false;
      }, 100);
    }
  }, [
    travelData,
    viewMode,
    activeItem,
    focusedItem,
    mapInstance,
    layerGroups,
    clearAllLayers,
    lastFitBoundsTime,
    lastFitBoundsSegmentId,
  ]);

  // Initial map data rendering
  // This useEffect runs only once when both map and data are ready
  useEffect(() => {
    if (mapInstance && travelData && layerGroups && !isRenderingRef.current) {
      debugLog("INITIAL_RENDER", "Performing initial map data rendering");
      renderMapData();
    }
  }, [mapInstance, travelData, layerGroups, renderMapData]);
  
  // Update map when view mode changes or active/focused item changes
  useEffect(() => {
    if (mapInstance && travelData && layerGroups) {
      // Skip if already rendering (prevents duplicate renders)
      if (isRenderingRef.current) {
        debugLog("MAP_UPDATE", "Skipping update due to active rendering");
        return;
      }

      debugLog("MAP_UPDATE", "Updating map due to view mode or item change");

      // Only use renderMapData if we're not in a local view with a focused item
      // This prevents conflicts with the explicit rendering in handleItemFocus
      if (!(viewMode === "local" && focusedItem && !activeItem)) {
        renderMapData();
      }
    }
  }, [
    viewMode,
    activeItem,
    focusedItem,
    renderMapData,
    mapInstance,
    travelData,
    layerGroups,
  ]);

  // Handler for timeline item selection (click)
  const handleItemSelect = (item) => {
    debugLog(
      "INTERACTION",
      `Timeline item selected: ${item.id} - Type: ${item.itemType}`
    );
    setActiveItem(item);
    // Clear focused item when actively selecting
    setFocusedItem(null);
    // Always set to local view for selected items
    setViewMode("local");
  };

  // Handler for timeline item focus (arrow keys)
  const handleItemFocus = (item) => {
    if (!item) return;

    debugLog(
      "INTERACTION",
      `Timeline item focused: ${item.id} - Type: ${item.itemType}`
    );

    // Clear the activeItem when using keyboard navigation
    // This ensures we don't have both activeItem and focusedItem set simultaneously
    if (activeItem) {
      setActiveItem(null);
    }

    // Set the focused item
    setFocusedItem(item);

    // Always switch to local view for arrow navigation, just like clicking
    setViewMode("local");

    // Force immediate map update without waiting for effect to fire
    if (mapInstance && travelData && layerGroups) {
      debugLog("MAP_UPDATE", "Direct map update from arrow key navigation");

      // Set the rendering lock to prevent effect-based duplicate renders
      isRenderingRef.current = true;

      // Use a small timeout to ensure state updates have been processed
      setTimeout(() => {
        try {
          // Clear all layers before updating
          clearAllLayers();

          // Local view implementation for the focused item
          if (item.itemType === "segment") {
            const segment = item;
            const originLat = segment.origin.coordinates[0];
            const originLng = segment.origin.coordinates[1];
            const destLat = segment.destination.coordinates[0];
            const destLng = segment.destination.coordinates[1];

            // Calculate and log the actual distance for debugging
            const distanceKm = calculateDistance(
              originLat,
              originLng,
              destLat,
              destLng
            );
            debugLog(
              "MAP_UPDATE",
              `Segment distance: ${distanceKm.toFixed(2)} km`
            );

            // Log map state before updating
            logMapState(mapInstance, `Before fitBounds for ${segment.type}`);

            // Special handling for different segment types
            if (segment.type === "flight") {
              // Create bounds that handle antimeridian crossing
              const bounds = createCrossingAwareBounds(
                originLat,
                originLng,
                destLat,
                destLng
              );

              // Check if this is an international flight
              const isInternationalFlight =
                (segment.origin.code === "ORD" &&
                  segment.destination.code === "NRT") ||
                (segment.origin.code === "HND" &&
                  segment.destination.code === "ORD");

              if (isInternationalFlight) {
                // For international flights
                mapInstance.fitBounds(bounds, {
                  padding: [100, 100],
                  maxZoom: 3,
                  animate: true,
                });
                debugLog(
                  "MAP_UPDATE",
                  `Using fitBounds for international flight ${segment.id}`
                );
              } else {
                // For domestic flights
                mapInstance.fitBounds(bounds, {
                  padding: [50, 50],
                  maxZoom: 7,
                  animate: true,
                });
                debugLog(
                  "MAP_UPDATE",
                  `Using fitBounds for domestic flight ${segment.id}`
                );
              }
            } else {
              // For non-flight segments (train, shuttle, walk, bus)
              const bounds = L.latLngBounds(
                L.latLng(originLat, originLng),
                L.latLng(destLat, destLng)
              );

              // Different padding and max zoom for different transport types
              if (segment.type === "walk" || segment.type === "shuttle") {
                // For short-distance transport
                mapInstance.fitBounds(bounds, {
                  padding: [100, 100],
                  maxZoom: 14,
                  animate: true,
                });
              } else {
                // For train, bus, etc.
                mapInstance.fitBounds(bounds, {
                  padding: [50, 50],
                  maxZoom: 10,
                  animate: true,
                });
              }

              debugLog(
                "MAP_UPDATE",
                `Using fitBounds for ${segment.type} segment ${segment.id}`
              );
            }

            // Log map state after updating (with small delay to ensure bounds are applied)
            setTimeout(() => {
              logMapState(mapInstance, `After fitBounds for ${segment.type}`);
            }, 100);

            const segmentType = segment.type;

            if (segmentType === "flight") {
              // For flights, use great circle paths
              drawFlightPathWithGreatCircle(
                segment,
                true,
                layerGroups.active,
                calculateGreatCirclePolylines
              );
            } else if (layerGroups.active) {
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
                    color: getRouteColor(segmentType),
                    weight: 4,
                    opacity: 0.8,
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
                  .addTo(layerGroups.active);
              }

              // Add markers with world copies
              // Origin marker
              createWorldCopiedMarker(
                originLat,
                originLng,
                createCustomIcon(segmentType, true),
                `<b>${segment.origin.name}</b>${
                  segment.origin.code ? ` (${segment.origin.code})` : ""
                }`,
                layerGroups.active
              );

              // Destination marker
              createWorldCopiedMarker(
                destLat,
                destLng,
                createCustomIcon(segmentType, true),
                `<b>${segment.destination.name}</b>${
                  segment.destination.code
                    ? ` (${segment.destination.code})`
                    : ""
                }`,
                layerGroups.active
              );
            }
          } else if (item.itemType === "stay") {
            // For accommodations
            const stay = item;
            const lat = stay.coordinates[0];
            const lng = stay.coordinates[1];

            // Log map state before updating
            logMapState(mapInstance, `Before fitBounds for accommodation`);

            // Create a small bounds around the point (approx 1km in each direction)
            const bounds = L.latLngBounds(
              L.latLng(lat - 0.009, lng - 0.009),
              L.latLng(lat + 0.009, lng + 0.009)
            );

            // Fit the map to these bounds
            mapInstance.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 15,
              animate: true,
            });

            // Log map state after updating
            setTimeout(() => {
              logMapState(mapInstance, `After fitBounds for accommodation`);
            }, 100);

            createWorldCopiedMarker(
              lat,
              lng,
              createAccommodationIcon(true),
              `
           <b>${stay.location}</b><br>
           ${stay.notes || ""}<br>
           ${stay.dateStart} to ${stay.dateEnd}
         `,
              layerGroups.active
            );

            // Optional: Show nearby segments as in renderMapData
            // Find segments that start or end near this accommodation (within ~1km)
            const nearbySegments = travelData.segments.filter((segment) => {
              // Check if origin or destination is close to this accommodation
              const isOriginClose =
                Math.abs(segment.origin.coordinates[0] - lat) < 0.01 &&
                Math.abs(segment.origin.coordinates[1] - lng) < 0.01;

              const isDestinationClose =
                Math.abs(segment.destination.coordinates[0] - lat) < 0.01 &&
                Math.abs(segment.destination.coordinates[1] - lng) < 0.01;

              return isOriginClose || isDestinationClose;
            });

            // Draw nearby segments
            nearbySegments.forEach((segment) => {
              const segmentType = segment.type;

              if (segmentType === "flight") {
                drawFlightPathWithGreatCircle(
                  segment,
                  false,
                  layerGroups[`${segmentType}s`],
                  calculateGreatCirclePolylines
                );
              } else {
                const layerGroup = layerGroups[`${segmentType}s`];
                if (layerGroup) {
                  // Draw the line
                  L.polyline(
                    [
                      segment.origin.coordinates,
                      segment.destination.coordinates,
                    ],
                    {
                      color: getRouteColor(segmentType),
                      weight: 2,
                      opacity: 0.7,
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

                  // Add origin marker if not at the accommodation
                  if (
                    !(
                      Math.abs(segment.origin.coordinates[0] - lat) < 0.01 &&
                      Math.abs(segment.origin.coordinates[1] - lng) < 0.01
                    )
                  ) {
                    createWorldCopiedMarker(
                      segment.origin.coordinates[0],
                      segment.origin.coordinates[1],
                      createCustomIcon(segmentType),
                      `<b>${segment.origin.name}</b>`,
                      layerGroup
                    );
                  }

                  // Add destination marker if not at the accommodation
                  if (
                    !(
                      Math.abs(segment.destination.coordinates[0] - lat) <
                        0.01 &&
                      Math.abs(segment.destination.coordinates[1] - lng) < 0.01
                    )
                  ) {
                    createWorldCopiedMarker(
                      segment.destination.coordinates[0],
                      segment.destination.coordinates[1],
                      createCustomIcon(segmentType),
                      `<b>${segment.destination.name}</b>`,
                      layerGroup
                    );
                  }
                }
              }
            });
          }

          // Ensure map is properly sized
          mapInstance.invalidateSize(true);
        } catch (error) {
          debugLog("ERROR", "Error in direct map update", error);
          setMapError(`Failed to update map: ${error.message}`);
        } finally {
          // Release the rendering lock after a short delay
          // This allows time for the current render to complete
          setTimeout(() => {
            isRenderingRef.current = false;
          }, 100);
        }
      }, 5);
    }
  };

  // Function to handle opening the album overlay
  const handleOpenAlbum = (item) => {
    // Set the item for the album content
    setAlbumItem(item);
    // Open the album
    setAlbumOpen(true);
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    refreshTripData();
  };

  // Map error handler
  const handleMapError = (error) => {
    setMapError(error);
  };
  
  // Trip selector change handler
  const handleTripChange = (tripId) => {
    setSelectedTripId(tripId);
  };

  // Loading state handling
  if (isLoading) {
    return <div style={loadingStyles.container}>Loading travel data...</div>;
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
      {/* Header with Trip Selector and Refresh Button */}
      <header style={headerStyles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <h1 style={headerStyles.title}>
              {travelData ? travelData.tripName : "Travel Map"}
            </h1>
            <button 
              onClick={handleManualRefresh}
              style={{
                marginLeft: "1rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                backgroundColor: isRefreshing ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
                color: "white",
                border: "none",
                fontSize: "0.75rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center"
              }}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", marginRight: "0.25rem", animation: "spin 1s linear infinite" }}></span>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg style={{ width: "12px", height: "12px", marginRight: "0.25rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                    <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
          
          {availableTrips.length > 1 && (
            <TripSelector 
              trips={availableTrips}
              selectedTripId={selectedTripId} 
              onTripChange={handleTripChange}
            />
          )}
        </div>
        <p style={headerStyles.subtitle}>{travelData?.dateRange}</p>
      </header>

      <div style={{ display: "flex", flex: "1", overflow: "hidden" }}>
        {/* Timeline Sidebar */}
        <TimelinePanel
          travelData={travelData}
          activeItem={activeItem}
          onItemSelect={handleItemSelect}
          onItemFocus={handleItemFocus}
        />

        {/* Map Area */}
        <div style={{ flex: "1", position: "relative" }}>
          {/* MapContainer - with stable key to prevent remounting issues */}
          <MapContainer
            key="japan-travel-map" 
            onMapReady={handleMapReady}
            onMapError={handleMapError}
          >
            {/* View Controls */}
            <ViewControls
              viewMode={viewMode}
              setViewMode={setViewMode}
              hasActiveItem={!!(activeItem || focusedItem)}
            />

            {/* Map Legend */}
            <MapLegend />

            {/* Create a single displayItem that combines activeItem and focusedItem */}
            {(() => {
              // Use activeItem with priority, or focusedItem if no activeItem
              const displayItem = activeItem || focusedItem;

              // If we have a valid display item, render the appropriate detail panel
              if (displayItem) {
                // Explicitly check item type to determine which component to render
                if (displayItem.itemType === "segment") {
                  return (
                    <SegmentDetail
                      segment={displayItem}  // Make sure we're passing the correct prop name
                      onClose={() => {
                        if (activeItem) setActiveItem(null);
                        else setFocusedItem(null);
                      }}
                      onUpdate={handleItemUpdate}
                      tripId={travelData?._id}
                      openAlbum={() => handleOpenAlbum(displayItem)}  // Pass the openAlbum function
                    />
                  );
                } else if (displayItem.itemType === "stay") {
                  return (
                    <AccommodationDetail
                      accommodation={displayItem}  // Make sure we're passing the correct prop name
                      onClose={() => {
                        if (activeItem) setActiveItem(null);
                        else setFocusedItem(null);
                      }}
                      onUpdate={handleItemUpdate}
                      tripId={travelData?._id}
                      openAlbum={() => handleOpenAlbum(displayItem)}  // Pass the openAlbum function
                    />
                  );
                }
              }
              return null;
            })()}
          </MapContainer>

          {/* Map Error Overlay */}
          {mapError && (
            <ErrorMessage
              message={mapError}
              onReload={() => window.location.reload()}
            />
          )}
        </div>
      </div>
      
      {/* Album Overlay */}
      <AlbumOverlay
        isOpen={albumOpen}
        onClose={() => setAlbumOpen(false)}
        mediaItems={albumItem?.media || []}
        title={
          albumItem?.itemType === 'segment' 
            ? `${albumItem.transport}: ${albumItem.origin.name} → ${albumItem.destination.name}`
            : albumItem?.location || 'Media Gallery'
        }
        description={
          albumItem?.itemType === 'segment'
            ? formatDate(albumItem.date)
            : albumItem ? `${formatDate(albumItem.dateStart)} - ${formatDate(albumItem.dateEnd)}` : ''
        }
      />
    </div>
  );
};

export default TravelMap;
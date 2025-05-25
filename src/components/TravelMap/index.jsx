import React, { useState, useEffect, useCallback} from "react";
import "leaflet/dist/leaflet.css";
import TripAPI from "../../services/tripApi";
import { headerStyles, loadingStyles } from "../../utils/styleUtils";
import { debugLog} from "../../utils/mapCalculations";
import { formatDate } from "../../utils/dateUtils";

// Components
import MapContainer from "./MapContainer";
import MapRenderer from "./MapRenderer";
import TimelinePanel from "./TimelinePanel";
import ViewControls from "./ViewControls";
import MapLegend from "./MapLegend";
import ItemDetail from "./ItemDetail";
import ErrorMessage from "../common/ErrorMessage";
import TripSelector from "./TripSelector";
import AlbumViewer from "./AlbumViewer";

// Custom hooks
import useMapLayers from "../../hooks/useMapLayers";

/**
 * TravelMap is the main component for the travel map application
 * Refactored to use MapRenderer component and simplified state management
 */
const TravelMap = () => {
  // Trip and data state
  const [travelData, setTravelData] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [availableTrips, setAvailableTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Map state
  const [mapInstance, setMapInstance] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [viewMode, setViewMode] = useState("japan");
  const [lastFitBoundsTime, setLastFitBoundsTime] = useState(0);
  const [lastFitBoundsSegmentId, setLastFitBoundsSegmentId] = useState(null);
  
  // UI state
  const [activeItem, setActiveItem] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [albumItem] = useState(null);

  // Initialize map layers when map is ready
  const { layerGroups, clearAllLayers } = useMapLayers(mapInstance);

  // Get display item (active or focused)
  const displayItem = activeItem || focusedItem;

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
          if (activeItem.itemType === 'segment') {
            const updatedSegment = refreshedTrip.segments.find(s => s.id === activeItem.id);
            if (updatedSegment) {
              setActiveItem({ ...updatedSegment, itemType: 'segment' });
            }
          } else if (activeItem.itemType === 'stay') {
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
        
        debugLog("DATA", "Trip data refreshed successfully");
      } catch (error) {
        console.error("Failed to refresh trip data:", error);
        debugLog("ERROR", "Failed to refresh trip data", error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [selectedTripId, activeItem]);

  // Handle item update
  const handleItemUpdate = async (updatedItem) => {
    const updatedTravelData = {...travelData};
    
    if (updatedItem.itemType === 'segment' || updatedItem.type) {
      const segmentIndex = updatedTravelData.segments.findIndex(s => s.id === updatedItem.id);
      
      if (segmentIndex !== -1) {
        updatedTravelData.segments[segmentIndex] = {
          ...updatedTravelData.segments[segmentIndex],
          ...updatedItem
        };
        console.log(`Updated segment: ${updatedItem.transport || updatedItem.id}`);
        
        if (activeItem && activeItem.id === updatedItem.id) {
          setActiveItem({ ...activeItem, ...updatedItem });
        }
        
        if (focusedItem && focusedItem.id === updatedItem.id) {
          setFocusedItem({ ...focusedItem, ...updatedItem });
        }
        
        try {
          await TripAPI.updateTrip(travelData._id, { segments: updatedTravelData.segments });
          console.log('Trip updated on server');
          await refreshTripData();
        } catch (err) {
          console.error('Failed to update trip on server:', err);
        }
      }
    } else {
      const stayId = updatedItem._id || updatedItem.id || `stay-${updatedItem.location.replace(/\s+/g, '-').toLowerCase()}`;
      const stayName = stayId.replace('stay-', '').replace(/-/g, ' ');
      
      const stayIndex = updatedTravelData.stays.findIndex(s => 
        s._id === updatedItem._id || 
        s.location.toLowerCase() === stayName.toLowerCase()
      );
      
      if (stayIndex !== -1) {
        updatedTravelData.stays[stayIndex] = {
          ...updatedTravelData.stays[stayIndex],
          ...updatedItem
        };
        console.log(`Updated stay: ${updatedItem.location}`);
        
        if (activeItem && (activeItem._id === updatedItem._id || activeItem.id === stayId)) {
          setActiveItem({ ...activeItem, ...updatedItem });
        }
        
        if (focusedItem && (focusedItem._id === updatedItem._id || focusedItem.id === stayId)) {
          setFocusedItem({ ...focusedItem, ...updatedItem });
        }
        
        try {
          await TripAPI.updateTrip(travelData._id, { stays: updatedTravelData.stays });
          console.log('Trip updated on server');
          await refreshTripData();
        } catch (err) {
          console.error('Failed to update trip on server:', err);
        }
      }
    }
    
    setTravelData(updatedTravelData);
  };

  // Fetch trips from API
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setIsLoading(true);
        debugLog("DATA", "Fetching trips from API");
        
        const trips = await TripAPI.getAllTrips();
        setAvailableTrips(trips);
        
        if (trips.length > 0) {
          const tripId = selectedTripId || trips[0]._id;
          setSelectedTripId(tripId);
          
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

  // Handle map being ready
  const handleMapReady = useCallback((map) => {
    if (mapInstance) {
      debugLog("MAP_INIT", "Duplicate map ready call detected, ignoring");
      return;
    }

    debugLog("MAP_INIT", "Map is ready, setting initial view");
    setMapInstance(map);
    map.setView([36.5, 138.5], 6);
  }, [mapInstance]);

  // Handle timeline item selection
  const handleItemSelect = (item) => {
    debugLog("INTERACTION", `Timeline item selected: ${item.id} - Type: ${item.itemType}`);
    setActiveItem(item);
    setFocusedItem(null);
    setViewMode("local");
  };

  // Handle timeline item focus
  const handleItemFocus = (item) => {
    if (!item) return;
    
    debugLog("INTERACTION", `Timeline item focused: ${item.id} - Type: ${item.itemType}`);
    
    if (activeItem) {
      setActiveItem(null);
    }
    
    setFocusedItem(item);
    setViewMode("local");
  };

  // Handle manual refresh
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

  // Loading state
  if (isLoading) {
    return <div style={loadingStyles.container}>Loading travel data...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f3f4f6" }}>
      {/* Header */}
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
          <MapContainer
            key="japan-travel-map" 
            onMapReady={handleMapReady}
            onMapError={handleMapError}
          >
            {/* MapRenderer handles all map rendering logic */}
            {mapInstance && travelData && (
              <MapRenderer
                mapInstance={mapInstance}
                travelData={travelData}
                layerGroups={layerGroups}
                viewMode={viewMode}
                displayItem={displayItem}
                lastFitBoundsTime={lastFitBoundsTime}
                setLastFitBoundsTime={setLastFitBoundsTime}
                lastFitBoundsSegmentId={lastFitBoundsSegmentId}
                setLastFitBoundsSegmentId={setLastFitBoundsSegmentId}
                clearAllLayers={clearAllLayers}
              />
            )}

            {/* View Controls */}
            <ViewControls
              viewMode={viewMode}
              setViewMode={setViewMode}
              hasActiveItem={!!(activeItem || focusedItem)}
            />

            {/* Map Legend */}
            <MapLegend />

            {/* Detail Panel */}
            {displayItem && (
              <ItemDetail
                item={displayItem}
                itemType={displayItem.itemType === "stay" ? "accommodation" : displayItem.itemType}
                onClose={() => {
                  if (activeItem) setActiveItem(null);
                  else setFocusedItem(null);
                }}
                onUpdate={handleItemUpdate}
                tripId={travelData?._id}
              />
            )}
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
      <AlbumViewer
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
        mode="media"
      />
    </div>
  );
};

export default TravelMap;
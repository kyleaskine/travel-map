import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { segmentDetailStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";
import AlbumAPI from "../../services/albumApi";
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';
import AlbumManager from "./AlbumManager";
import AlbumView from "./AlbumView";

/**
 * Enhanced SegmentDetail component for album-centric architecture
 */
const SegmentDetail = ({ segment, onClose, onUpdate, tripId, openAlbum }) => {
  // Default to albums tab as requested by the user
  const [activeTab, setActiveTab] = useState('albums');
  const detailContainerRef = useRef(null); // Ref for the container element
  
  // Album state
  const [albums, setAlbums] = useState([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  
  // Album view state
  const [albumViewOpen, setAlbumViewOpen] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  
  // Function to load albums
  const loadAlbums = useCallback(async () => {
    if (!tripId || !segment?.id) return;
    
    setIsLoadingAlbums(true);
    try {
      const albumData = await AlbumAPI.getAlbumsByItem(tripId, 'segment', segment.id);
      console.log(`Loaded ${albumData.length} albums for segment ${segment.id}`);
      setAlbums(albumData);
      
      // If we have albums but none selected, select the first one
      if (albumData.length > 0 && !selectedAlbumId) {
        setSelectedAlbumId(albumData[0]._id);
      }
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [tripId, segment?.id, selectedAlbumId]);
  
  // Load albums when the component mounts or when dependencies change
  useEffect(() => {
    if (tripId && segment && segment.id) {
      loadAlbums();
    }
  }, [tripId, segment, segment?.id, loadAlbums]);
  
  // Improved mouse wheel event handling to prevent scrolling map
  useEffect(() => {
    // Use the ref directly instead of querySelector
    const detailContainer = detailContainerRef.current;
    
    if (!detailContainer) {
      console.log("Detail container ref not available");
      return;
    }
    
    console.log("Adding wheel event listener to detail container");
    
    // Function to prevent wheel events from propagating to map
    const preventWheelPropagation = (e) => {
      // Stop the event from reaching the map
      e.stopPropagation();
      
      // Get current scroll position and limits
      const { scrollHeight, clientHeight, scrollTop } = detailContainer;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // -1 for rounding errors
      
      // If at the limits and trying to scroll further in that direction, let the map handle it
      // Otherwise, handle scrolling within the container
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        // At limits, allow default (map zoom)
        console.log("At scroll limit, allowing default");
      } else {
        // Not at limits, prevent default and handle scroll manually
        e.preventDefault();
        console.log("Handling scroll within container");
        
        // Manual scroll (smoother than letting the browser do it)
        detailContainer.scrollTop += e.deltaY;
      }
    };
    
    // Add event listener with capture phase to ensure it gets the event first
    detailContainer.addEventListener('wheel', preventWheelPropagation, { 
      passive: false,
      capture: true  // This is important to capture the event before it reaches other handlers
    });
    
    // Clean up function
    return () => {
      console.log("Removing wheel event listener");
      if (detailContainer) {
        detailContainer.removeEventListener('wheel', preventWheelPropagation, { 
          passive: false,
          capture: true
        });
      }
    };
  }, []);
  
  if (!segment) return null;
  
  // Handle album creation - now updated to refresh data
  const handleAlbumCreated = async (createdAlbum) => {
    loadAlbums();
    return createdAlbum;
  };
  
  // Handle album selection for viewing
  const handleAlbumSelected = (album) => {
    setSelectedAlbumId(album._id);
    setAlbumViewOpen(true);
  };
  
  // Handle refresh after media operations
  const handleRefreshNeeded = () => {
    loadAlbums();
    
    // If onUpdate exists, notify parent that data may have changed
    if (onUpdate) {
      onUpdate(segment);
    }
  };
  
  // Handle View All Albums button click
  const handleViewAllAlbums = () => {
    setAlbumViewOpen(true);
  };

  return (
    <>
      <div 
        ref={detailContainerRef} // Add the ref here
        style={{
          ...segmentDetailStyles.container,
          width: "360px", // Wider to accommodate form and albums
          maxHeight: "450px",
          overflowY: "auto"
        }}
      >
        <div style={segmentDetailStyles.header}>
          <h3 style={segmentDetailStyles.title}>
            {segment.transport}
          </h3>
          <button
            style={segmentDetailStyles.closeButton}
            onClick={onClose}
            aria-label="Close details"
          >
            ✕
          </button>
        </div>
        
        <div style={segmentDetailStyles.date}>
          {formatDate(segment.date)}
        </div>
        
        <div style={segmentDetailStyles.typeIndicator}>
          <div style={segmentDetailStyles.typeDot(segment.type)}></div>
          <div style={segmentDetailStyles.typeText}>
            {segment.type}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mt-3 mb-3">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('albums')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'albums'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Albums
              {albums.length > 0 && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  {albums.length}
                </span>
              )}
            </button>
          </nav>
        </div>
        
        {/* Details Tab Content */}
        {activeTab === 'details' && (
          <div style={segmentDetailStyles.details}>
            <div style={segmentDetailStyles.detailItem}>
              <strong>From:</strong> {segment.origin.name}
              {segment.origin.code && ` (${segment.origin.code})`}
            </div>
            <div style={segmentDetailStyles.detailItem}>
              <strong>To:</strong> {segment.destination.name}
              {segment.destination.code && ` (${segment.destination.code})`}
            </div>
            {segment.notes && (
              <div style={segmentDetailStyles.detailItem}>
                <strong>Notes:</strong> {segment.notes}
              </div>
            )}
            
            {/* Quick album preview if we have albums */}
            {albums.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Photo Albums</h4>
                  <button 
                    className="text-blue-500 text-xs"
                    onClick={handleViewAllAlbums}
                  >
                    View All
                  </button>
                </div>
                
                <div className="flex overflow-x-auto space-x-2 pb-2">
                  {albums.map((album) => (
                    <div 
                      key={album._id}
                      className="flex-shrink-0 w-16 cursor-pointer"
                      onClick={() => handleAlbumSelected(album)}
                    >
                      <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                        {album.coverImage ? (
                          <img
                            src={getImageUrl(album.coverImage.content)}
                            alt={album.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = getFallbackImageUrl();
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No cover
                          </div>
                        )}
                      </div>
                      <div className="text-xs truncate mt-1">{album.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Albums Tab Content */}
        {activeTab === 'albums' && (
          <div className="p-2">
            {isLoadingAlbums ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <AlbumManager
                tripId={tripId}
                itemType="segment"
                itemId={segment.id}
                albums={albums}
                onAlbumCreated={handleAlbumCreated}
                onAlbumSelected={handleAlbumSelected}
                onRefreshNeeded={handleRefreshNeeded}
                defaultOpen={albums.length === 0}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Album View (full-screen overlay) */}
      <AlbumView
        isOpen={albumViewOpen}
        onClose={() => setAlbumViewOpen(false)}
        albums={albums}
        selectedAlbumId={selectedAlbumId}
        title={`Albums for ${segment.transport}`}
        description={`From ${segment.origin.name} to ${segment.destination.name}`}
      />
    </>
  );
};

SegmentDetail.propTypes = {
  segment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    transport: PropTypes.string.isRequired,
    origin: PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string,
      coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
    }).isRequired,
    destination: PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string,
      coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
    }).isRequired,
    notes: PropTypes.string,
    defaultAlbumId: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,
  tripId: PropTypes.string,
  openAlbum: PropTypes.func
};

export default SegmentDetail;
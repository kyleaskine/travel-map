import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { segmentDetailStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';
import AlbumManager from "./AlbumManager";
import AlbumViewer from "./AlbumViewer";
import useAlbums from "../../hooks/useAlbums";

/**
 * Unified ItemDetail component for both segments and accommodations
 * Updated to use useAlbums hook
 */
const ItemDetail = ({ 
  item, 
  itemType, 
  onClose, 
  onUpdate, 
  tripId 
}) => {
  // Default to albums tab
  const [activeTab, setActiveTab] = useState('albums');
  const detailContainerRef = useRef(null);
  
  // Album view state
  const [albumViewOpen, setAlbumViewOpen] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  
  // Extract item ID for API calls
  const getItemId = useCallback(() => {
    if (!item) return null;
    
    if (itemType === 'segment') {
      return item.id;
    } else {
      // For accommodations, use MongoDB _id if available, otherwise use location-based ID
      return item._id || `stay-${item.location.replace(/\s+/g, '-').toLowerCase()}`;
    }
  }, [item, itemType]);
  
  // Use the albums hook
  const { albums, isLoading: isLoadingAlbums, loadAlbums } = useAlbums(
    tripId, 
    itemType === 'accommodation' ? 'stay' : itemType, 
    getItemId()
  );
  
  // Set initial selected album when albums load
  useEffect(() => {
    if (albums.length > 0 && !selectedAlbumId) {
      setSelectedAlbumId(albums[0]._id);
    }
  }, [albums, selectedAlbumId]);
  
  // Mouse wheel event handling to prevent scrolling map
  useEffect(() => {
    const detailContainer = detailContainerRef.current;
    
    if (!detailContainer) {
      console.log("Detail container ref not available");
      return;
    }
    
    console.log("Adding wheel event listener to detail container");
    
    const preventWheelPropagation = (e) => {
      e.stopPropagation();
      
      const { scrollHeight, clientHeight, scrollTop } = detailContainer;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        console.log("At scroll limit, allowing default");
      } else {
        e.preventDefault();
        console.log("Handling scroll within container");
        detailContainer.scrollTop += e.deltaY;
      }
    };
    
    detailContainer.addEventListener('wheel', preventWheelPropagation, { 
      passive: false,
      capture: true
    });
    
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
  
  if (!item) return null;
  
  // Handle album creation
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
    
    if (onUpdate) {
      onUpdate(item);
    }
  };
  
  // Handle View All Albums button click
  const handleViewAllAlbums = () => {
    setAlbumViewOpen(true);
  };
  
  // Get the title and color based on item type
  const getTitle = () => {
    if (itemType === 'segment') {
      return item.transport;
    } else {
      return item.location;
    }
  };
  
  const getColor = () => {
    if (itemType === 'segment') {
      return segmentDetailStyles.typeDot(item.type).backgroundColor;
    } else {
      return '#8800ff';
    }
  };

  return (
    <>
      <div 
        ref={detailContainerRef}
        style={{
          ...segmentDetailStyles.container,
          borderLeft: `4px solid ${getColor()}`,
          width: "360px",
          maxHeight: "450px",
          overflowY: "auto"
        }}
      >
        <div style={segmentDetailStyles.header}>
          <h3 style={segmentDetailStyles.title}>
            {getTitle()}
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
          {itemType === 'segment' 
            ? formatDate(item.date)
            : `${formatDate(item.dateStart)} - ${formatDate(item.dateEnd)}`}
        </div>
        
        <div style={segmentDetailStyles.typeIndicator}>
          {itemType === 'segment' ? (
            <>
              <div style={segmentDetailStyles.typeDot(item.type)}></div>
              <div style={segmentDetailStyles.typeText}>
                {item.type}
              </div>
            </>
          ) : (
            <>
              <div style={{
                width: "1rem",
                height: "1rem",
                backgroundColor: "#8800ff",
                borderRadius: "9999px",
                marginRight: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}>
                  H
                </span>
              </div>
              <div style={segmentDetailStyles.typeText}>
                Accommodation
              </div>
            </>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mt-3 mb-3">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'details'
                  ? `border-b-2 ${itemType === 'segment' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600'}`
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('albums')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'albums'
                  ? `border-b-2 ${itemType === 'segment' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600'}`
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Albums
              {albums.length > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  itemType === 'segment' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {albums.length}
                </span>
              )}
            </button>
          </nav>
        </div>
        
        {/* Details Tab Content */}
        {activeTab === 'details' && (
          <div style={segmentDetailStyles.details}>
            {/* Segment-specific details */}
            {itemType === 'segment' && (
              <>
                <div style={segmentDetailStyles.detailItem}>
                  <strong>From:</strong> {item.origin.name}
                  {item.origin.code && ` (${item.origin.code})`}
                </div>
                <div style={segmentDetailStyles.detailItem}>
                  <strong>To:</strong> {item.destination.name}
                  {item.destination.code && ` (${item.destination.code})`}
                </div>
              </>
            )}
            
            {/* Accommodation-specific details */}
            {itemType === 'accommodation' && (
              <>
                <div style={segmentDetailStyles.detailItem}>
                  <strong>Coordinates:</strong> {item.coordinates[0].toFixed(4)}, {item.coordinates[1].toFixed(4)}
                </div>
                {item.amenities && item.amenities.length > 0 && (
                  <div style={segmentDetailStyles.detailItem}>
                    <strong>Amenities:</strong> {item.amenities.join(', ')}
                  </div>
                )}
              </>
            )}
            
            {/* Common details */}
            {item.notes && (
              <div style={segmentDetailStyles.detailItem}>
                <strong>Notes:</strong> {item.notes}
              </div>
            )}
            
            {item._id && (
              <div style={segmentDetailStyles.detailItem}>
                <strong>ID:</strong> {item._id}
              </div>
            )}
            
            {/* Quick album preview if we have albums */}
            {albums.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Photo Albums</h4>
                  <button 
                    className={itemType === 'segment' ? 'text-blue-500 text-xs' : 'text-purple-500 text-xs'}
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
                <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${
                  itemType === 'segment' ? 'border-blue-500' : 'border-purple-500'
                }`}></div>
              </div>
            ) : (
              <AlbumManager
                tripId={tripId}
                itemType={itemType === 'accommodation' ? 'stay' : itemType}
                itemId={getItemId()}
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
      <AlbumViewer
        isOpen={albumViewOpen}
        onClose={() => setAlbumViewOpen(false)}
        albums={albums}
        selectedAlbumId={selectedAlbumId}
        title={`Albums for ${getTitle()}`}
        description={
          itemType === 'segment'
            ? `From ${item.origin.name} to ${item.destination.name}`
            : `${formatDate(item.dateStart)} - ${formatDate(item.dateEnd)}`
        }
        onAlbumUpdated={handleRefreshNeeded}
        mode="albums"
      />
    </>
  );
};

ItemDetail.propTypes = {
  item: PropTypes.object.isRequired,
  itemType: PropTypes.oneOf(['segment', 'accommodation']).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,
  tripId: PropTypes.string
};

export default ItemDetail;
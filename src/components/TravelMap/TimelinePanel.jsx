import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { timelineStyles } from "../../utils/styleUtils";
import { groupSegmentsByDate, formatDate } from "../../utils/dateUtils";
import { debugLog } from "../../utils/mapCalculations";
import TimelineSegment from "./TimelineSegment";
import TimelineStay from "./TimelineStay";
import AlbumView from "./AlbumView";
import AlbumOverlay from "./AlbumOverlay"; // Import AlbumOverlay for viewing individual media
import AlbumAPI from "../../services/albumApi";
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';

/**
 * Enhanced TimelinePanel with albums and media display
 * Fixed to properly handle media item viewing
 */
const TimelinePanel = ({ 
  travelData, 
  activeItem,
  onItemSelect,
  onItemFocus
}) => {
  const timelinePanelRef = useRef(null);
  const [allTimelineItems, setAllTimelineItems] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  // View state
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline', 'albums', 'media'
  
  // Albums state
  const [allAlbums, setAllAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [albumViewOpen, setAlbumViewOpen] = useState(false);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  
  // Media state - now properly used for viewing individual media items
  const [allMediaItems, setAllMediaItems] = useState([]);
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);
  const [mediaViewOpen, setMediaViewOpen] = useState(false);
  
  // Load all albums for the trip
  const loadAllAlbums = useCallback(async () => {
    if (!travelData || !travelData._id) return;
    
    setIsLoadingAlbums(true);
    try {
      const albumData = await AlbumAPI.getAlbumsByTrip(travelData._id);
      setAllAlbums(albumData);
      
      // Extract all media from all segments and stays
      const allMedia = [];
      
      // Add media from segments
      travelData.segments.forEach(segment => {
        if (segment.media && segment.media.length > 0) {
          segment.media.forEach(media => {
            allMedia.push({
              ...media,
              sourceType: 'segment',
              sourceId: segment.id,
              sourceName: `${segment.transport}: ${segment.origin.name} → ${segment.destination.name}`,
              sourceDate: segment.date
            });
          });
        }
      });
      
      // Add media from stays
      travelData.stays.forEach(stay => {
        if (stay.media && stay.media.length > 0) {
          stay.media.forEach(media => {
            allMedia.push({
              ...media,
              sourceType: 'stay',
              sourceId: stay._id || `stay-${stay.location.replace(/\s+/g, '-').toLowerCase()}`,
              sourceName: stay.location,
              sourceDate: stay.dateStart
            });
          });
        }
      });
      
      console.log(`Loaded ${allMedia.length} media items across all segments and stays`);
      setAllMediaItems(allMedia);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [travelData]);
  
  // Process timeline data
  useEffect(() => {
    if (!travelData) return;
    
    // Create an array of all timeline items from segments and stays
    const items = [
      // Add segments directly
      ...travelData.segments.map(segment => ({
        ...segment,
        type: segment.type,
        itemType: 'segment',
        date: segment.date,
        sortDate: new Date(segment.date).getTime()
      })),
      
      // Add stays with start and end dates
      ...travelData.stays.map(stay => ({
        ...stay,
        type: 'accommodation',
        itemType: 'stay',
        date: stay.dateStart,
        sortDate: new Date(stay.dateStart).getTime(),
        id: stay._id || `stay-${stay.location.replace(/\s+/g, '-').toLowerCase()}`
      }))
    ];
    
    // Sort all items chronologically
    const sortedItems = items.sort((a, b) => a.sortDate - b.sortDate);
    setAllTimelineItems(sortedItems);
    
    // If there's an active item, find its index to set initial focus
    if (activeItem) {
      const activeIndex = sortedItems.findIndex(item => 
        (item.itemType === 'segment' && item.id === activeItem.id) ||
        (item.itemType === 'stay' && item.id === activeItem.id)
      );
      if (activeIndex !== -1) {
        setFocusedIndex(activeIndex);
      }
    }
    
    // Load all albums
    loadAllAlbums();
  }, [travelData, activeItem, loadAllAlbums]);
  
  // Set up keyboard navigation
  useEffect(() => {
    if (!allTimelineItems.length) return;
    
    const handleKeyDown = (e) => {
      // Only process if not in album view and timeline panel is focused
      if (albumViewOpen || mediaViewOpen) return;
      
      const timelineElement = timelinePanelRef.current;
      const activeElement = document.activeElement;
      
      if (!timelineElement || 
          (activeElement !== timelineElement && !timelineElement.contains(activeElement))) {
        return;
      }
      
      // Navigation between timeline/albums/media view modes
      if (e.key === 'Tab') {
        e.preventDefault();
        setViewMode(prevMode => {
          switch (prevMode) {
            case 'timeline': return 'albums';
            case 'albums': return 'media';
            case 'media': return 'timeline';
            default: return 'timeline';
          }
        });
        return;
      }
      
      // Special key handling based on view mode
      if (viewMode === 'timeline') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex(prevIndex => {
            const newIndex = prevIndex <= 0 ? allTimelineItems.length - 1 : prevIndex - 1;
            const fullItem = allTimelineItems[newIndex];
            
            debugLog("KEYBOARD_NAV", "Arrow Up - Focused item:", fullItem);
            
            // Scroll the item into view
            const itemElement = document.getElementById(`timeline-item-${newIndex}`);
            if (itemElement) {
              itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            if (onItemFocus && fullItem) {
              onItemFocus(fullItem);
            }
            
            return newIndex;
          });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex(prevIndex => {
            const newIndex = prevIndex >= allTimelineItems.length - 1 ? 0 : prevIndex + 1;
            const fullItem = allTimelineItems[newIndex];
            
            debugLog("KEYBOARD_NAV", "Arrow Down - Focused item:", fullItem);
            
            // Scroll the item into view
            const itemElement = document.getElementById(`timeline-item-${newIndex}`);
            if (itemElement) {
              itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            if (onItemFocus && fullItem) {
              onItemFocus(fullItem);
            }
            
            return newIndex;
          });
        } else if (e.key === 'Enter' && focusedIndex >= 0) {
          e.preventDefault();
          const selectedItem = allTimelineItems[focusedIndex];
          
          debugLog("KEYBOARD_NAV", "Enter pressed - Selected item:", selectedItem);
          
          if (selectedItem && onItemSelect) {
            onItemSelect(selectedItem);
          }
        }
      } else if (viewMode === 'albums') {
        // Albums view navigation
        if (e.key === 'Enter' && allAlbums.length > 0) {
          e.preventDefault();
          setSelectedAlbumId(allAlbums[0]._id);
          setAlbumViewOpen(true);
        }
      } else if (viewMode === 'media') {
        // Media view navigation
        if (e.key === 'Enter' && allMediaItems.length > 0) {
          e.preventDefault();
          handleViewMedia(allMediaItems[0]);
        }
      }
    };
    
    // Add event listener to window
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [allTimelineItems, focusedIndex, onItemSelect, onItemFocus, albumViewOpen, mediaViewOpen, viewMode, allAlbums, allMediaItems]);
  
  // Effect to make the timeline focusable
  useEffect(() => {
    const panelElement = timelinePanelRef.current;
    if (panelElement) {
      // Make the panel focusable
      panelElement.setAttribute('tabindex', '0');
      // Focus it initially to enable keyboard navigation
      panelElement.focus();
    }
  }, []);
  
  // Handle viewing an album
  const handleViewAlbum = (album) => {
    setSelectedAlbumId(album._id);
    setAlbumViewOpen(true);
  };
  
  // Handle viewing a media item - UPDATED to properly handle viewing media
  const handleViewMedia = (item) => {
    // Check if item is a media item or a timeline item with media
    if (item.type === 'photo' || item.type === 'note') {
      // If passed a single media item, find its source and all related media
      const mediaItem = item;
      
      if (mediaItem.sourceType === 'segment') {
        const segment = travelData.segments.find(s => s.id === mediaItem.sourceId);
        if (segment && segment.media && segment.media.length > 0) {
          // Pass all media for this segment
          setSelectedMediaItem({
            title: `${segment.transport}: ${segment.origin.name} → ${segment.destination.name}`,
            description: formatDate(segment.date),
            media: segment.media
          });
          setMediaViewOpen(true);
          
          // Also select the segment in the timeline
          onItemSelect({
            ...segment,
            itemType: 'segment'
          });
        }
      } else if (mediaItem.sourceType === 'stay') {
        const stay = travelData.stays.find(s => 
          s._id === mediaItem.sourceId || 
          `stay-${s.location.replace(/\s+/g, '-').toLowerCase()}` === mediaItem.sourceId
        );
        if (stay && stay.media && stay.media.length > 0) {
          // Pass all media for this stay
          setSelectedMediaItem({
            title: stay.location,
            description: `${formatDate(stay.dateStart)} - ${formatDate(stay.dateEnd)}`,
            media: stay.media
          });
          setMediaViewOpen(true);
          
          // Also select the stay in the timeline
          onItemSelect({
            ...stay,
            itemType: 'stay',
            id: stay._id || `stay-${stay.location.replace(/\s+/g, '-').toLowerCase()}`
          });
        }
      }
    } else if (item.media && item.media.length > 0) {
      // If passed a segment or stay directly, use its media
      if (item.itemType === 'segment') {
        setSelectedMediaItem({
          title: `${item.transport}: ${item.origin.name} → ${item.destination.name}`,
          description: formatDate(item.date),
          media: item.media
        });
      } else if (item.itemType === 'stay') {
        setSelectedMediaItem({
          title: item.location,
          description: `${formatDate(item.dateStart)} - ${formatDate(item.dateEnd)}`,
          media: item.media
        });
      }
      setMediaViewOpen(true);
    }
  };

  if (!travelData) return (
    <div style={{
      ...timelineStyles.container,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <p>Loading timeline...</p>
    </div>
  );

  // Process the timeline data for display
  const segmentsByDate = groupSegmentsByDate(allTimelineItems);
  
  return (
    <>
      <div 
        ref={timelinePanelRef} 
        style={{
          ...timelineStyles.container,
          zIndex: albumViewOpen || mediaViewOpen ? 1 : 10, // Lower z-index when overlay is open
        }}
        className="timeline-panel"
        tabIndex="0" // Make the container focusable
      >
        {/* Timeline Header with View Selector */}
        <div style={timelineStyles.header}>
          <div className="flex justify-between items-center">
            <h2 style={{ fontWeight: "bold" }}>Travel Timeline</h2>
            <div className="flex space-x-1">
              <button 
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'timeline' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'albums' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setViewMode('albums')}
              >
                Albums {allAlbums.length > 0 && `(${allAlbums.length})`}
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'media' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setViewMode('media')}
              >
                Media {allMediaItems.length > 0 && `(${allMediaItems.length})`}
              </button>
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            {viewMode === 'timeline' && "Use ↑/↓ to navigate, Tab to switch views"}
            {viewMode === 'albums' && "View and manage all trip albums"}
            {viewMode === 'media' && "Browse all media across your trip"}
          </div>
        </div>
        
        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div>
            {segmentsByDate.map((dayGroup) => (
              <div key={dayGroup.date} style={{ marginBottom: "0.5rem" }}>
                {/* Day Header */}
                <div style={timelineStyles.dayHeader}>
                  <div style={timelineStyles.dayText}>
                    {dayGroup.dayOfWeek}, {dayGroup.month} {dayGroup.dayOfMonth}
                  </div>
                </div>
                
                {/* Items for this day */}
                <div>
                  {dayGroup.segments.map((item) => {
                    // Calculate the global index for this item in the allTimelineItems array
                    const globalIdx = allTimelineItems.findIndex(ti => 
                      (item.itemType === 'segment' && ti.id === item.id) || 
                      (item.itemType === 'stay' && ti.id === item.id)
                    );
                    
                    const isActive = activeItem && activeItem.id === item.id;
                    const isFocused = focusedIndex === globalIdx;
                    
                    if (item.itemType === 'stay') {
                      return (
                        <TimelineStay
                          key={item.id}
                          stay={item}
                          isActive={isActive}
                          isFocused={isFocused}
                          onClick={() => onItemSelect(item)}
                          onViewMedia={handleViewMedia} // Pass media viewer handler
                          id={`timeline-item-${globalIdx}`}
                        />
                      );
                    } else {
                      return (
                        <TimelineSegment
                          key={item.id}
                          segment={item}
                          isActive={isActive}
                          isFocused={isFocused}
                          onClick={() => onItemSelect(item)}
                          onViewMedia={handleViewMedia} // Pass media viewer handler
                          id={`timeline-item-${globalIdx}`}
                        />
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Albums View */}
        {viewMode === 'albums' && (
          <div className="p-3">
            {isLoadingAlbums ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : allAlbums.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {allAlbums.map((album) => {
                  // Find a cover image for the album
                  const coverPhoto = album.media && album.media.find(m => m.type === 'photo');
                  
                  // Get related item info
                  const itemInfo = album.itemType === 'segment' 
                    ? travelData.segments.find(s => s.id === album.itemId)
                    : travelData.stays.find(s => s._id === album.itemId || 
                        `stay-${s.location.replace(/\s+/g, '-').toLowerCase()}` === album.itemId);
                  
                  const itemName = itemInfo 
                    ? (album.itemType === 'segment' 
                        ? `${itemInfo.transport}: ${itemInfo.origin.name} → ${itemInfo.destination.name}` 
                        : itemInfo.location)
                    : 'Unknown item';
                  
                  return (
                    <div
                      key={album._id}
                      className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewAlbum(album)}
                    >
                      {coverPhoto ? (
                        <div className="aspect-video bg-gray-100">
                          <img
                            src={getImageUrl(coverPhoto.content)}
                            alt={album.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = getFallbackImageUrl();
                            }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                          No photos
                        </div>
                      )}
                      <div className="p-2">
                        <h3 className="font-medium text-sm">{album.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{itemName}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">
                            {album.media ? album.media.length : 0} items
                          </span>
                          <span className="text-xs text-blue-500">View</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No albums created yet</p>
                <p className="text-sm mt-2">Create albums in the segment or stay details panel</p>
              </div>
            )}
          </div>
        )}
        
        {/* Media View */}
        {viewMode === 'media' && (
          <div className="p-3 overflow-auto">
            {allMediaItems.length > 0 ? (
              <div className="space-y-6">
                {/* Photos */}
                <div>
                  <h3 className="font-medium mb-2 text-sm">Photos ({allMediaItems.filter(m => m.type === 'photo').length})</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {allMediaItems
                      .filter(media => media.type === 'photo')
                      .map((media, index) => (
                        <div 
                          key={`photo-${index}`} 
                          className="relative cursor-pointer"
                          onClick={() => handleViewMedia(media)}
                        >
                          <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                            <img
                              src={getImageUrl(media.content)}
                              alt={media.caption || 'Photo'}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                              onError={(e) => {
                                e.target.src = getFallbackImageUrl();
                              }}
                            />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-1">
                            <p className="text-white text-xs truncate">
                              {media.sourceName}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                {/* Notes */}
                <div>
                  <h3 className="font-medium mb-2 text-sm">Notes ({allMediaItems.filter(m => m.type === 'note').length})</h3>
                  <div className="space-y-2">
                    {allMediaItems
                      .filter(media => media.type === 'note')
                      .map((media, index) => (
                        <div 
                          key={`note-${index}`} 
                          className="border rounded p-2 bg-white cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => handleViewMedia(media)}
                        >
                          <p className="text-xs text-gray-500">{media.sourceName}</p>
                          {media.caption && (
                            <p className="text-sm font-medium">{media.caption}</p>
                          )}
                          <p className="text-sm mt-1">
                            {media.content.length > 100 
                              ? `${media.content.substring(0, 100)}...` 
                              : media.content}
                          </p>
                          <div className="text-xs text-right text-blue-500 mt-1">View in detail →</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No media items yet</p>
                <p className="text-sm mt-2">Add photos and notes in segment or stay details</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Album Viewer Overlay */}
      <AlbumView
        isOpen={albumViewOpen}
        onClose={() => setAlbumViewOpen(false)}
        albums={allAlbums}
        selectedAlbumId={selectedAlbumId}
        title="Trip Albums"
        description={travelData.tripName}
      />

      {/* Individual Media Viewer Overlay */}
      {selectedMediaItem && (
        <AlbumOverlay
          isOpen={mediaViewOpen}
          onClose={() => setMediaViewOpen(false)}
          mediaItems={selectedMediaItem.media} // Pass all media items, not just one
          title={selectedMediaItem.title || "Media Viewer"}
          description={selectedMediaItem.description || ""}
        />
      )}
    </>
  );
};

TimelinePanel.propTypes = {
  travelData: PropTypes.shape({
    _id: PropTypes.string,
    tripName: PropTypes.string.isRequired,
    dateRange: PropTypes.string.isRequired,
    segments: PropTypes.array.isRequired,
    stays: PropTypes.array.isRequired
  }),
  activeItem: PropTypes.object,
  onItemSelect: PropTypes.func.isRequired,
  onItemFocus: PropTypes.func
};

export default TimelinePanel;
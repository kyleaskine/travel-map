import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { timelineStyles } from "../../utils/styleUtils";
import { groupSegmentsByDate, formatDate } from "../../utils/dateUtils";
import { debugLog } from "../../utils/mapCalculations";
import TimelineSegment from "./TimelineSegment";
import TimelineStay from "./TimelineStay";
import AlbumView from "./AlbumView";
import AlbumAPI from "../../services/albumApi";

/**
 * TimelinePanel component - Updated for album-centric architecture
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
  
  // Albums state
  const [itemAlbums, setItemAlbums] = useState({}); // Map of itemId -> albums array
  const [albumViewOpen, setAlbumViewOpen] = useState(false);
  const [currentViewItem, setCurrentViewItem] = useState(null);
  const [currentViewAlbums, setCurrentViewAlbums] = useState([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  
  // Load albums for all items - wrapped in useCallback with proper dependencies
  const loadAllItemAlbums = useCallback(async (items) => {
    if (!travelData || !travelData._id) return;
    
    setIsLoadingAlbums(true);
    
    // Create a new item albums map
    const newItemAlbums = {};
    
    try {
      // Initialize all items with empty album arrays
      items.forEach(item => {
        newItemAlbums[item.id] = [];
      });
      
      // Load all albums for the trip
      const allAlbums = await AlbumAPI.getAlbumsByTrip(travelData._id);
      
      // Group albums by item
      allAlbums.forEach(album => {
        if (album.relatedItem && album.relatedItem.itemId) {
          // Find matching item by type and ID
          const matchingItem = items.find(item => 
            item.itemType === album.relatedItem.type && (
              item.id === album.relatedItem.itemId || 
              item._id === album.relatedItem.itemId
            )
          );
          
          if (matchingItem) {
            if (!newItemAlbums[matchingItem.id]) {
              newItemAlbums[matchingItem.id] = [];
            }
            
            newItemAlbums[matchingItem.id].push(album);
          }
        }
      });
      
      // Update state with all album data
      setItemAlbums(newItemAlbums);
      
      // If we have a current view item, update its albums as well
      if (currentViewItem) {
        setCurrentViewAlbums(newItemAlbums[currentViewItem.id] || []);
      }
    } catch (error) {
      console.error('Failed to load albums for items:', error);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [travelData, currentViewItem]); // Added proper dependencies
  
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
        (item.itemType === 'stay' && (
          item.id === activeItem.id || 
          item._id === activeItem._id
        ))
      );
      if (activeIndex !== -1) {
        setFocusedIndex(activeIndex);
      }
    }
    
    // Load albums for all segments and stays in the background
    loadAllItemAlbums(items);
  }, [travelData, activeItem, loadAllItemAlbums]); // Added loadAllItemAlbums to dependency array
  
  // Set up keyboard navigation
  useEffect(() => {
    if (!allTimelineItems.length) return;
    
    const handleKeyDown = (e) => {
      // Only process if not in album view and timeline panel is focused
      if (albumViewOpen) return;
      
      const timelineElement = timelinePanelRef.current;
      const activeElement = document.activeElement;
      
      if (!timelineElement || 
          (activeElement !== timelineElement && !timelineElement.contains(activeElement))) {
        return;
      }
      
      // Arrow key navigation
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
    };
    
    // Add event listener to window
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [allTimelineItems, focusedIndex, onItemSelect, onItemFocus, albumViewOpen]);
  
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
  
  // Handle view albums for a specific item
  const handleViewAlbums = (item, albums) => {
    setCurrentViewItem(item);
    setCurrentViewAlbums(albums);
    setAlbumViewOpen(true);
  };
  
  // Handle album updates (refresh albums after changes)
  const handleAlbumUpdated = useCallback(() => {
    // Reload all item albums
    if (allTimelineItems.length > 0) {
      loadAllItemAlbums(allTimelineItems);
    }
  }, [allTimelineItems, loadAllItemAlbums]); // Added loadAllItemAlbums to dependency array

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
          zIndex: albumViewOpen ? 1 : 10, // Lower z-index when overlay is open
        }}
        className="timeline-panel"
        tabIndex="0" // Make the container focusable
      >
        {/* Timeline Header */}
        <div style={timelineStyles.header}>
          <h2 style={{ fontWeight: "bold" }}>Travel Timeline</h2>
          {isLoadingAlbums && (
            <div className="text-xs text-gray-500">Loading albums...</div>
          )}
        </div>
        
        {/* Timeline By Day */}
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
                    (item.itemType === 'stay' && (ti.id === item.id || ti._id === item._id))
                  );
                  
                  const isActive = activeItem && (
                    (activeItem.id === item.id) || 
                    (activeItem._id === item._id)
                  );
                  const isFocused = focusedIndex === globalIdx;
                  
                  // Get any albums for this item
                  const albums = itemAlbums[item.id] || [];
                  
                  if (item.itemType === 'stay') {
                    return (
                      <TimelineStay
                        key={item.id || item._id}
                        stay={item}
                        albums={albums}
                        isActive={isActive}
                        isFocused={isFocused}
                        onClick={() => onItemSelect(item)}
                        onViewAlbums={handleViewAlbums}
                        id={`timeline-item-${globalIdx}`}
                      />
                    );
                  } else {
                    return (
                      <TimelineSegment
                        key={item.id}
                        segment={item}
                        albums={albums}
                        isActive={isActive}
                        isFocused={isFocused}
                        onClick={() => onItemSelect(item)}
                        onViewAlbums={handleViewAlbums}
                        id={`timeline-item-${globalIdx}`}
                      />
                    );
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Album View Overlay */}
      {currentViewItem && (
        <AlbumView
          isOpen={albumViewOpen}
          onClose={() => setAlbumViewOpen(false)}
          albums={currentViewAlbums}
          title={
            currentViewItem.itemType === 'segment' 
              ? `Albums for ${currentViewItem.transport}` 
              : `Albums for ${currentViewItem.location}`
          }
          description={
            currentViewItem.itemType === 'segment'
              ? `From ${currentViewItem.origin.name} to ${currentViewItem.destination.name}`
              : `${formatDate(currentViewItem.dateStart)} - ${formatDate(currentViewItem.dateEnd)}`
          }
          onAlbumUpdated={handleAlbumUpdated}
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
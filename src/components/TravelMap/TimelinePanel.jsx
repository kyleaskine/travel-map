import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { timelineStyles } from "../../utils/styleUtils";
import { groupSegmentsByDate } from "../../utils/dateUtils";
import { debugLog } from "../../utils/mapCalculations";
import ExpandableTimelineSegment from "./ExpandableTimelineSegment";
import ExpandableTimelineStay from "./ExpandableTimelineStay";
import MediaViewer from "./MediaViewer";

/**
 * Enhanced TimelinePanel component with expandable entries and media viewer
 */
const TimelinePanel = ({ 
  travelData, 
  activeItem,
  onItemSelect,
  onItemFocus
}) => {
  const timelinePanelRef = useRef(null);
  // Keep track of all timeline items (segments and stays)
  const [allTimelineItems, setAllTimelineItems] = useState([]);
  // Current focused index for keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  // Media viewer state
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerItem, setMediaViewerItem] = useState(null);
  
  // Process and combine segments and stays into a chronological timeline
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
        id: `stay-${stay.location.replace(/\s+/g, '-').toLowerCase()}`
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
  }, [travelData, activeItem]);
  
  // Set up keyboard navigation
  useEffect(() => {
    // Skip if no timeline items
    if (!allTimelineItems.length) return;
    
    const handleKeyDown = (e) => {
      // Only process if not in media viewer mode
      if (mediaViewerOpen) return;
      
      // Only process if the timeline panel is focused or contains the active element
      const timelineElement = timelinePanelRef.current;
      const activeElement = document.activeElement;
      
      if (!timelineElement || 
          (activeElement !== timelineElement && !timelineElement.contains(activeElement))) {
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prevIndex => {
          const newIndex = prevIndex <= 0 ? allTimelineItems.length - 1 : prevIndex - 1;
          // Get the full item object
          const fullItem = allTimelineItems[newIndex];
          
          // Log the full item details before passing it along
          debugLog("KEYBOARD_NAV", "Arrow Up - Focused item:", fullItem);
          
          // Scroll the item into view
          const itemElement = document.getElementById(`timeline-item-${newIndex}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          
          // Important: Pass the FULL ITEM OBJECT, not just an ID
          if (onItemFocus && fullItem) {
            // Pass the item to parent for display on the map
            // This is critical - we need to pass the FULL object
            onItemFocus(fullItem);
          }
          
          return newIndex;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prevIndex => {
          const newIndex = prevIndex >= allTimelineItems.length - 1 ? 0 : prevIndex + 1;
          // Get the full item object
          const fullItem = allTimelineItems[newIndex];
          
          // Log the full item details before passing it along
          debugLog("KEYBOARD_NAV", "Arrow Down - Focused item:", fullItem);
          
          // Scroll the item into view
          const itemElement = document.getElementById(`timeline-item-${newIndex}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          
          // Important: Pass the FULL ITEM OBJECT, not just an ID
          if (onItemFocus && fullItem) {
            // Pass the item to parent for display on the map
            // This is critical - we need to pass the FULL object
            onItemFocus(fullItem);
          }
          
          return newIndex;
        });
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        // Get the FULL item object for selection
        const selectedItem = allTimelineItems[focusedIndex];
        
        // Log the full item details before passing it along
        debugLog("KEYBOARD_NAV", "Enter pressed - Selected item:", selectedItem);
        
        // Pass the FULL item to parent
        if (selectedItem) {
          onItemSelect(selectedItem);
        }
      } else if (e.key === 'ArrowRight' && focusedIndex >= 0) {
        e.preventDefault();
        // Get the current item
        const item = allTimelineItems[focusedIndex];
        
        // Check if item has media
        if (item && item.media && item.media.length > 0) {
          // Open media viewer with this item
          handleViewMedia(item);
        }
      }
    };
    
    // Add event listener to window
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [allTimelineItems, focusedIndex, onItemSelect, onItemFocus, mediaViewerOpen]);
  
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
  
  // Handle viewing media for an item
  const handleViewMedia = (item) => {
    setMediaViewerItem(item);
    setMediaViewerOpen(true);
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
  // Group segments by date but also include stays
  const segmentsByDate = groupSegmentsByDate(allTimelineItems);

  return (
    <>
      <div 
        ref={timelinePanelRef} 
        style={{
          ...timelineStyles.container,
          zIndex: mediaViewerOpen ? 1 : 10, // Lower z-index when media viewer is open
        }}
        className="timeline-panel"
        tabIndex="0" // Make the container focusable
      >
        {/* Timeline Header */}
        <div style={timelineStyles.header}>
          <h2 style={{ fontWeight: "bold" }}>Travel Timeline</h2>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            Use ↑/↓ to navigate, → to view media
          </div>
        </div>
        
        {/* Timeline Days and Items */}
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
                      <ExpandableTimelineStay
                        key={item.id}
                        stay={item}
                        isActive={isActive}
                        isFocused={isFocused}
                        onClick={() => onItemSelect(item)} // Pass the full item object
                        onViewMedia={() => handleViewMedia(item)} // Handle viewing media
                        id={`timeline-item-${globalIdx}`}
                      />
                    );
                  } else {
                    return (
                      <ExpandableTimelineSegment
                        key={item.id}
                        segment={item}
                        isActive={isActive}
                        isFocused={isFocused}
                        onClick={() => onItemSelect(item)} // Pass the full item object
                        onViewMedia={() => handleViewMedia(item)} // Handle viewing media
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
      
      {/* Media Viewer (higher z-index, overlay everything) */}
      {mediaViewerOpen && mediaViewerItem && (
        <MediaViewer
          item={mediaViewerItem}
          onClose={() => setMediaViewerOpen(false)}
        />
      )}
    </>
  );
};

TimelinePanel.propTypes = {
  travelData: PropTypes.shape({
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
import React from "react";
import PropTypes from "prop-types";
import { timelineStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";
import TimelineMediaIndicator from "./TimelineMediaIndicator";

/**
 * TimelineSegment component - Updated for album-centric architecture
 */
const TimelineSegment = ({ 
  segment, 
  albums = [], // Now takes albums instead of media
  isActive, 
  isFocused, 
  onClick, 
  onViewAlbums, // Changed from onViewMedia
  id 
}) => {
  const MAX_NAME_LENGTH = 15;
  
  // Handle View Albums click - Explicitly stop propagation
  const handleViewAlbums = (e) => {
    e.stopPropagation();
    if (onViewAlbums && albums && albums.length > 0) {
      onViewAlbums(segment, albums);
    }
  };

  return (
    <div
      id={id}
      className={`border-l-4 ${
        isFocused 
          ? "border-blue-500" 
          : "border-transparent"
      } transition-all duration-200`}
    >
      {/* Main timeline item (always visible) */}
      <div
        style={{
          ...timelineStyles.segmentItem(isActive),
          backgroundColor: isActive 
            ? "#ebf5ff" 
            : isFocused 
              ? "#f0f7ff" 
              : "transparent",
        }}
        onClick={onClick}
        className="flex flex-col cursor-pointer"
        data-testid={`segment-${segment.id}`}
      >
        <div className="flex items-center justify-between">
          {/* Left side: segment info */}
          <div className="flex items-center flex-1">
            <div style={timelineStyles.segmentDot(segment.type)}></div>
            <div style={timelineStyles.segmentTitle}>
              {segment.transport}
            </div>
          </div>
        </div>
        
        <div style={timelineStyles.segmentSubtitle}>
          {segment.origin.name.length > MAX_NAME_LENGTH
            ? `${segment.origin.name.substring(0, MAX_NAME_LENGTH)}...`
            : segment.origin.name} →{" "}
          {segment.destination.name.length > MAX_NAME_LENGTH
            ? `${segment.destination.name.substring(0, MAX_NAME_LENGTH)}...`
            : segment.destination.name}
        </div>
        
        {/* Date display */}
        <div style={{
          fontSize: "0.75rem",
          marginTop: "0.25rem",
          marginLeft: "1.25rem",
          color: "#4b5563",
        }}>
          {formatDate(segment.date)}
        </div>
        
        {/* Album Indicator - only show if there are albums */}
        {albums && albums.length > 0 && (
          <div 
            className="ml-5 mt-2" 
            data-testid={`album-indicator-${segment.id}`}
            onClick={handleViewAlbums}
          >
            <TimelineMediaIndicator 
              albums={albums} 
              onClick={handleViewAlbums}
            />
          </div>
        )}
        
        {/* Default album indicator - show if there's a defaultAlbumId but no loaded albums yet */}
        {(!albums || albums.length === 0) && segment.defaultAlbumId && (
          <div className="ml-5 mt-2 flex items-center text-xs text-gray-500">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
            </svg>
            Has albums
          </div>
        )}
      </div>
    </div>
  );
};

TimelineSegment.propTypes = {
  segment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    transport: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    origin: PropTypes.shape({
      name: PropTypes.string.isRequired
    }).isRequired,
    destination: PropTypes.shape({
      name: PropTypes.string.isRequired
    }).isRequired,
    defaultAlbumId: PropTypes.string
  }).isRequired,
  albums: PropTypes.array, // Array of albums for this segment
  isActive: PropTypes.bool.isRequired,
  isFocused: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onViewAlbums: PropTypes.func,
  id: PropTypes.string
};

TimelineSegment.defaultProps = {
  isFocused: false,
  albums: []
};

export default TimelineSegment;
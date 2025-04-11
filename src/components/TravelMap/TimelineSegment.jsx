import React from "react";
import PropTypes from "prop-types";
import { timelineStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";
import TimelineMediaIndicator from "./TimelineMediaIndicator";

/**
 * TimelineSegment component with integrated media preview
 * Fixed to properly handle media click events
 */
const TimelineSegment = ({ 
  segment, 
  isActive, 
  isFocused, 
  onClick, 
  onViewMedia,
  id 
}) => {
  const MAX_NAME_LENGTH = 15;
  
  // Handle View Media click - Explicitly stop propagation to prevent parent click handler
  const handleViewMedia = (e) => {
    e.stopPropagation(); // This is crucial to stop the click event from reaching parent
    if (onViewMedia && segment.media && segment.media.length > 0) {
      onViewMedia(segment);
    }
  };

  console.log(`Rendering TimelineSegment ${segment.id}:`, {
    hasMedia: segment.media && segment.media.length > 0,
    mediaCount: segment.media ? segment.media.length : 0
  });

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
        
        {/* Media Indicator - only show if there's media */}
        {segment.media && segment.media.length > 0 && (
          <div 
            className="ml-5 mt-2" 
            data-testid={`media-indicator-${segment.id}`}
            onClick={handleViewMedia}
          >
            <TimelineMediaIndicator 
              media={segment.media} 
              onClick={handleViewMedia}
            />
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
    media: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        caption: PropTypes.string,
        dateCreated: PropTypes.string
      })
    )
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isFocused: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onViewMedia: PropTypes.func,
  id: PropTypes.string
};

TimelineSegment.defaultProps = {
  isFocused: false
};

export default TimelineSegment;
import React from "react";
import PropTypes from "prop-types";
import { formatDate } from "../../utils/dateUtils";
import TimelineMediaIndicator from "./TimelineMediaIndicator";

/**
 * TimelineStay component with integrated media preview
 */
const TimelineStay = ({ 
  stay, 
  isActive, 
  isFocused, 
  onClick, 
  onViewMedia,
  id 
}) => {
  // Handle View Media click
  const handleViewMedia = (e) => {
    e.stopPropagation();
    if (onViewMedia) {
      onViewMedia(stay);
    }
  };

  // Debug logging to help troubleshoot media issues
  console.log(`Rendering TimelineStay ${stay.id || stay.location}:`, {
    hasMedia: stay.media && stay.media.length > 0,
    mediaCount: stay.media ? stay.media.length : 0,
    mediaItems: stay.media
  });

  return (
    <div
      id={id}
      className={`border-l-4 ${
        isFocused 
          ? "border-purple-500" 
          : "border-transparent"
      } transition-all duration-200`}
      data-testid={`stay-${stay.id || stay.location.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {/* Main timeline item (always visible) */}
      <div
        style={{
          padding: "0.75rem",
          backgroundColor: isActive 
            ? "#f0e7ff" 
            : isFocused 
              ? "#f9f5ff" 
              : "transparent",
          borderBottom: "1px solid #f3f4f6",
          cursor: "pointer",
        }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          {/* Left side: stay info */}
          <div className="flex items-center flex-1">
            <div
              style={{
                width: "1rem",
                height: "1rem",
                backgroundColor: "#8800ff",
                borderRadius: "9999px",
                marginRight: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                H
              </span>
            </div>
            <div
              style={{
                fontWeight: "500",
                fontSize: "0.875rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {stay.location}
            </div>
          </div>
        </div>
        
        {/* Date range */}
        <div
          style={{
            fontSize: "0.75rem",
            marginTop: "0.25rem",
            marginLeft: "1.25rem",
            color: "#4b5563",
          }}
        >
          {formatDate(stay.dateStart)} - {formatDate(stay.dateEnd)}
        </div>
        
        {/* Notes (if available) */}
        {stay.notes && (
          <div
            style={{
              fontSize: "0.75rem",
              marginTop: "0.25rem",
              marginLeft: "1.25rem",
              color: "#4b5563",
              fontStyle: "italic",
            }}
          >
            {stay.notes.length > 60 
              ? `${stay.notes.substring(0, 60)}...` 
              : stay.notes}
          </div>
        )}
        
        {/* Media Indicator - only show if there's media */}
        {stay.media && stay.media.length > 0 && (
          <div 
            className="ml-5 mt-2"
            data-testid={`media-indicator-${stay.id || stay.location.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <TimelineMediaIndicator 
              media={stay.media} 
              onClick={handleViewMedia}
            />
          </div>
        )}
      </div>
    </div>
  );
};

TimelineStay.propTypes = {
  stay: PropTypes.shape({
    id: PropTypes.string,
    location: PropTypes.string.isRequired,
    dateStart: PropTypes.string.isRequired,
    dateEnd: PropTypes.string.isRequired,
    notes: PropTypes.string,
    coordinates: PropTypes.arrayOf(PropTypes.number).isRequired,
    media: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        caption: PropTypes.string
      })
    )
  }).isRequired,
  isActive: PropTypes.bool,
  isFocused: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onViewMedia: PropTypes.func,
  id: PropTypes.string
};

TimelineStay.defaultProps = {
  isActive: false,
  isFocused: false
};

export default TimelineStay;
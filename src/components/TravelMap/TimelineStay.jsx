import React from "react";
import PropTypes from "prop-types";
import { formatDate } from "../../utils/dateUtils";
import TimelineMediaIndicator from "./TimelineMediaIndicator";

/**
 * TimelineStay component - Updated for album-centric architecture
 */
const TimelineStay = ({ 
  stay, 
  albums = [], // Now takes albums instead of media
  isActive, 
  isFocused, 
  onClick, 
  onViewAlbums, // Changed from onViewMedia
  id 
}) => {
  // Handle View Albums click - Explicitly stop propagation
  const handleViewAlbums = (e) => {
    e.stopPropagation();
    if (onViewAlbums && albums && albums.length > 0) {
      onViewAlbums(stay, albums);
    }
  };

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
        
        {/* Album Indicator - only show if there are albums */}
        {albums && albums.length > 0 && (
          <div 
            className="ml-5 mt-2"
            data-testid={`album-indicator-${stay.id || stay.location.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={handleViewAlbums}
          >
            <TimelineMediaIndicator 
              albums={albums} 
              onClick={handleViewAlbums}
            />
          </div>
        )}
        
        {/* Default album indicator - show if there's a defaultAlbumId but no loaded albums yet */}
        {(!albums || albums.length === 0) && stay.defaultAlbumId && (
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

TimelineStay.propTypes = {
  stay: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    location: PropTypes.string.isRequired,
    dateStart: PropTypes.string.isRequired,
    dateEnd: PropTypes.string.isRequired,
    notes: PropTypes.string,
    coordinates: PropTypes.arrayOf(PropTypes.number).isRequired,
    defaultAlbumId: PropTypes.string
  }).isRequired,
  albums: PropTypes.array, // Array of albums for this stay
  isActive: PropTypes.bool,
  isFocused: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onViewAlbums: PropTypes.func,
  id: PropTypes.string
};

TimelineStay.defaultProps = {
  isActive: false,
  isFocused: false,
  albums: []
};

export default TimelineStay;
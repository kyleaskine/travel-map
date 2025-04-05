import React from "react";
import PropTypes from "prop-types";
import { timelineStyles } from "../../utils/styleUtils";
import { truncateString } from "../../utils/dateUtils";

/**
 * Enhanced TimelineSegment component with media indicators
 */
const TimelineSegment = ({ segment, isActive, isFocused, onClick, id }) => {
  const MAX_NAME_LENGTH = 15;
  const hasMedia = segment.media && segment.media.length > 0;
  const photoCount = hasMedia ? segment.media.filter(item => item.type === 'photo').length : 0;
  const noteCount = hasMedia ? segment.media.filter(item => item.type === 'note').length : 0;

  return (
    <div
      id={id}
      style={{
        ...timelineStyles.segmentItem(isActive),
        borderLeft: isFocused ? "3px solid #2563eb" : "3px solid transparent",
        backgroundColor: isActive 
          ? "#ebf5ff" 
          : isFocused 
            ? "#f0f7ff" 
            : "transparent", 
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={timelineStyles.segmentDot(segment.type)}></div>
        <div style={{
          ...timelineStyles.segmentTitle,
          flex: 1, // Allow title to take remaining space
        }}>
          {segment.transport}
        </div>
        
        {/* Media indicators */}
        {(photoCount > 0 || noteCount > 0) && (
          <div className="flex space-x-1">
            {photoCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {photoCount}
              </span>
            )}
            {noteCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                {noteCount}
              </span>
            )}
          </div>
        )}
      </div>
      <div style={timelineStyles.segmentSubtitle}>
        {truncateString(segment.origin.name, MAX_NAME_LENGTH)} →{" "}
        {truncateString(segment.destination.name, MAX_NAME_LENGTH)}
      </div>
    </div>
  );
};

TimelineSegment.propTypes = {
  segment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    transport: PropTypes.string.isRequired,
    origin: PropTypes.shape({
      name: PropTypes.string.isRequired
    }).isRequired,
    destination: PropTypes.shape({
      name: PropTypes.string.isRequired
    }).isRequired,
    media: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired
      })
    )
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isFocused: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  id: PropTypes.string
};

export default TimelineSegment;
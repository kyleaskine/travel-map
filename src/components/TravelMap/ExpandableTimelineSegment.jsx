import React, { useState } from "react";
import PropTypes from "prop-types";
import { timelineStyles } from "../../utils/styleUtils";
import { truncateString, formatDate } from "../../utils/dateUtils";

/**
 * ExpandableTimelineSegment component with collapsible media preview
 */
const ExpandableTimelineSegment = ({ 
  segment, 
  isActive, 
  isFocused, 
  onClick, 
  onViewMedia,
  id 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_NAME_LENGTH = 15;
  
  // Check if media is available
  const hasMedia = segment.media && segment.media.length > 0;
  const photoCount = hasMedia ? segment.media.filter(item => item.type === 'photo').length : 0;
  const noteCount = hasMedia ? segment.media.filter(item => item.type === 'note').length : 0;
  
  // Get preview photo if available
  const previewPhoto = hasMedia && photoCount > 0 
    ? segment.media.find(item => item.type === 'photo')
    : null;
    
  // Get preview note if available
  const previewNote = hasMedia && noteCount > 0
    ? segment.media.find(item => item.type === 'note')
    : null;
  
  // Toggle expanded state without triggering the onClick handler
  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  // View media handler
  const handleViewMedia = (e) => {
    e.stopPropagation();
    if (onViewMedia) {
      onViewMedia(segment);
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
      >
        <div className="flex items-center justify-between">
          {/* Left side: segment info */}
          <div className="flex items-center flex-1">
            <div style={timelineStyles.segmentDot(segment.type)}></div>
            <div style={timelineStyles.segmentTitle}>
              {segment.transport}
            </div>
          </div>
          
          {/* Right side: expand/collapse button */}
          <div className="flex items-center">
            {/* Media indicators */}
            {hasMedia && (
              <div className="flex items-center mr-2 text-xs text-gray-500">
                {photoCount > 0 && (
                  <span className="flex items-center mr-1">
                    <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    {photoCount}
                  </span>
                )}
                {noteCount > 0 && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    {noteCount}
                  </span>
                )}
              </div>
            )}
            
            {/* Expand/collapse button */}
            {hasMedia && (
              <button 
                onClick={toggleExpand}
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full focus:outline-none"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                <svg 
                  className={`w-4 h-4 transform transition-transform ${isExpanded ? "rotate-180" : ""}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div style={timelineStyles.segmentSubtitle}>
          {truncateString(segment.origin.name, MAX_NAME_LENGTH)} →{" "}
          {truncateString(segment.destination.name, MAX_NAME_LENGTH)}
        </div>
        
        {/* Added properly styled date */}
        <div style={{
          fontSize: "0.75rem",
          marginTop: "0.25rem",
          marginLeft: "1.25rem",
          color: "#4b5563",
        }}>
          {formatDate(segment.date)}
        </div>
      </div>
      
      {/* Expanded content (only visible when expanded) */}
      {isExpanded && hasMedia && (
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-100">
          <div className="flex flex-col">
            {/* Preview area */}
            <div className="mb-2">
              {previewPhoto && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">Photos ({photoCount})</div>
                  <div className="relative w-full h-24 bg-gray-200 rounded overflow-hidden">
                    <img 
                      src={previewPhoto.content} 
                      alt={previewPhoto.caption || "Preview"} 
                      className="w-full h-full object-cover"
                    />
                    {photoCount > 1 && (
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs rounded px-1">
                        +{photoCount - 1} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {previewNote && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Notes ({noteCount})</div>
                  <div className="p-2 bg-white rounded border border-gray-200 text-xs line-clamp-3">
                    {previewNote.caption && (
                      <div className="font-medium mb-1">{previewNote.caption}</div>
                    )}
                    <div className="text-gray-700 line-clamp-2">
                      {truncateString(previewNote.content, 120)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* View all button */}
            <button
              onClick={handleViewMedia}
              className="self-end flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              View All
              <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

ExpandableTimelineSegment.propTypes = {
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
        caption: PropTypes.string
      })
    )
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isFocused: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onViewMedia: PropTypes.func,
  id: PropTypes.string
};

export default ExpandableTimelineSegment;
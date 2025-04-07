import React from "react";
import PropTypes from "prop-types";

/**
 * Compact media indicator component for timeline items
 * Shows a small preview and count of available media
 */
const TimelineMediaIndicator = ({ media, onClick }) => {
  if (!media || media.length === 0) return null;

  // Count photos and notes
  const photoCount = media.filter(item => item.type === 'photo').length;
  const noteCount = media.filter(item => item.type === 'note').length;
  
  // Find the first photo for preview
  const previewPhoto = media.find(item => item.type === 'photo');

  return (
    <div 
      className="flex items-center space-x-2 mt-2 cursor-pointer"
      onClick={onClick}
    >
      {/* Photo preview */}
      {previewPhoto ? (
        <div className="relative h-10 w-14 flex-shrink-0">
          <img
            src={previewPhoto.content}
            alt="Preview"
            className="h-full w-full object-cover rounded"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
            }}
          />
          {photoCount > 1 && (
            <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded-tl">
              +{photoCount - 1}
            </div>
          )}
        </div>
      ) : (
        <div className="h-10 w-14 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">
          No img
        </div>
      )}
      
      {/* Media counts */}
      <div className="flex items-center space-x-2 text-xs text-gray-600">
        {photoCount > 0 && (
          <span className="flex items-center">
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
        <span className="text-blue-500 font-medium">View</span>
      </div>
    </div>
  );
};

TimelineMediaIndicator.propTypes = {
  media: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      caption: PropTypes.string
    })
  ),
  onClick: PropTypes.func.isRequired
};

export default TimelineMediaIndicator;
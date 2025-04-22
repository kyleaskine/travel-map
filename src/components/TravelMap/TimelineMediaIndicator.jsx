import React from "react";
import PropTypes from "prop-types";
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';

/**
 * Updated TimelineMediaIndicator for album-centric approach
 * Shows album previews instead of individual media
 */
const TimelineMediaIndicator = ({ albums, onClick }) => {
  // If no albums, don't render anything
  if (!albums || albums.length === 0) {
    return null;
  }

  // Count total media across all albums
  const totalItems = albums.reduce((total, album) => total + (album.totalItems || 0), 0);
  const totalAlbums = albums.length;
  
  // Find the first album with a cover image
  const albumWithCover = albums.find(album => album.coverImage || (album.media && album.media.find(m => m.type === 'photo')));
  
  // Find a photo to preview
  let previewUrl = null;
  
  if (albumWithCover) {
    if (albumWithCover.coverImage) {
      previewUrl = albumWithCover.coverImage.content;
    } else if (albumWithCover.media) {
      const photo = albumWithCover.media.find(m => m.type === 'photo');
      if (photo) {
        previewUrl = photo.content;
      }
    }
  }

  // Key for forcing re-render when albums change
  const renderKey = `albums-${totalAlbums}-${totalItems}-${Date.now()}`;

  // Function to handle click events and prevent bubbling
  const handleClick = (e) => {
    if (e) {
      e.stopPropagation(); // Stop event bubbling
      e.preventDefault(); // Prevent default behavior
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div 
      className="flex items-center space-x-2 mt-2 cursor-pointer"
      onClick={handleClick}
      key={renderKey}
      data-testid="timeline-album-indicator"
      data-album-count={totalAlbums}
    >
      {/* Album preview */}
      {previewUrl ? (
        <div className="relative h-10 w-14 flex-shrink-0">
          <img
            src={getImageUrl(previewUrl)}
            alt="Album preview"
            className="h-full w-full object-cover rounded"
            onError={(e) => {
              e.target.src = getFallbackImageUrl();
            }}
          />
          {totalAlbums > 1 && (
            <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded-tl">
              +{totalAlbums - 1}
            </div>
          )}
        </div>
      ) : (
        <div className="h-10 w-14 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">
          {totalAlbums} album{totalAlbums !== 1 ? 's' : ''}
        </div>
      )}
      
      {/* Album and media counts */}
      <div className="flex items-center space-x-2 text-xs text-gray-600">
        <span className="flex items-center">
          <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
          </svg>
          {totalAlbums}
        </span>
        <span className="flex items-center">
          <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          {totalItems}
        </span>
        <span className="text-blue-500 font-medium">View</span>
      </div>
    </div>
  );
};

TimelineMediaIndicator.propTypes = {
  albums: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      totalItems: PropTypes.number,
      coverImage: PropTypes.object,
      media: PropTypes.array
    })
  ),
  onClick: PropTypes.func.isRequired
};

export default TimelineMediaIndicator;
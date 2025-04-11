import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';

/**
 * AlbumOverlay component - Enhanced photo gallery that displays as an overlay
 * Fixed for better note display and improved navigation
 */
const AlbumOverlay = ({ 
  isOpen, 
  onClose, 
  mediaItems, 
  title,
  description,
  initialIndex = 0 
}) => {
  // State for currently selected image
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [infoVisible, setInfoVisible] = useState(true);
  const [viewType, setViewType] = useState('all'); // 'all', 'photos', 'notes'
  
  // Reset the selected index when media items change or when the overlay opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(initialIndex);
      
      // Automatically detect what media types are available
      const hasPhotos = mediaItems?.some(item => item.type === 'photo');
      const hasNotes = mediaItems?.some(item => item.type === 'note');
      
      if (hasPhotos && !hasNotes) {
        setViewType('photos');
      } else if (hasNotes && !hasPhotos) {
        setViewType('notes');
      } else {
        setViewType('all');
      }
    }
  }, [isOpen, initialIndex, mediaItems]);
  
  // Filter media items based on view type
  const filteredMediaItems = viewType === 'all' 
    ? mediaItems 
    : viewType === 'photos' 
      ? mediaItems?.filter(item => item.type === 'photo') 
      : mediaItems?.filter(item => item.type === 'note');
  
  // Get the currently selected item
  const currentItem = filteredMediaItems?.[selectedIndex];
  
  // Navigate to next and previous images
  const nextImage = useCallback(() => {
    if (!filteredMediaItems?.length) return;
    setSelectedIndex(prev => (prev === filteredMediaItems.length - 1) ? 0 : prev + 1);
  }, [filteredMediaItems]);
  
  const prevImage = useCallback(() => {
    if (!filteredMediaItems?.length) return;
    setSelectedIndex(prev => (prev === 0) ? filteredMediaItems.length - 1 : prev - 1);
  }, [filteredMediaItems]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'i') {
        setInfoVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, nextImage, prevImage, onClose]);
  
  // If the overlay is not open or there are no media items, don't render anything
  if (!isOpen || !mediaItems || mediaItems.length === 0) {
    return null;
  }
  
  // Count media types
  const photoCount = mediaItems.filter(item => item.type === 'photo').length;
  const noteCount = mediaItems.filter(item => item.type === 'note').length;
  
  // Determine if this is a photo or note
  const isPhoto = currentItem && currentItem.type === 'photo';
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col"
      onClick={() => onClose()}
    >
      {/* Header with title and close button */}
      <div 
        className="bg-gray-900 text-white p-4 flex justify-between items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-xl font-semibold">{title || 'Media Gallery'}</h2>
          {description && <p className="text-sm text-gray-300">{description}</p>}
        </div>
        <div className="flex space-x-2">
          {/* Media type filter buttons */}
          {photoCount > 0 && noteCount > 0 && (
            <div className="flex bg-gray-800 rounded-lg mr-2">
              <button
                onClick={() => {
                  setViewType('all');
                  setSelectedIndex(0);
                }}
                className={`px-2 py-1 text-sm rounded-l-lg ${
                  viewType === 'all' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setViewType('photos');
                  setSelectedIndex(0);
                }}
                className={`px-2 py-1 text-sm ${
                  viewType === 'photos' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Photos ({photoCount})
              </button>
              <button
                onClick={() => {
                  setViewType('notes');
                  setSelectedIndex(0);
                }}
                className={`px-2 py-1 text-sm rounded-r-lg ${
                  viewType === 'notes' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Notes ({noteCount})
              </button>
            </div>
          )}
        
          <button
            onClick={() => setInfoVisible(!infoVisible)}
            className="p-2 text-gray-300 hover:text-white"
            aria-label={infoVisible ? "Hide info" : "Show info"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d={infoVisible ? 
                  "M13 10V3L4 14h7v7l9-11h-7z" : 
                  "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"}
              />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white"
            aria-label="Close gallery"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Main content area */}
      <div 
        className="flex-grow flex flex-col items-center justify-center p-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {filteredMediaItems.length > 0 ? (
          <>
            {/* Main media display */}
            <div className="relative max-w-5xl max-h-[70vh] flex items-center justify-center">
              {isPhoto ? (
                <img 
                  src={getImageUrl(currentItem.content)}
                  alt={currentItem.caption || `Image ${selectedIndex + 1}`} 
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={(e) => {
                    console.error("Failed to load image:", currentItem.content);
                    e.target.src = getFallbackImageUrl();
                  }}
                />
              ) : (
                <div className="bg-gray-800 p-6 rounded-lg max-w-full max-h-[70vh] overflow-auto">
                  <div className="text-white whitespace-pre-wrap">
                    {currentItem?.content || 'No content available'}
                  </div>
                </div>
              )}

              {/* Navigation arrows */}
              {filteredMediaItems.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl bg-black bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center"
                    aria-label="Previous image"
                  >
                    ←
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl bg-black bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center"
                    aria-label="Next image"
                  >
                    →
                  </button>
                </>
              )}
              
              {/* Caption overlay */}
              {infoVisible && currentItem?.caption && (
                <div className="absolute left-0 right-0 bottom-0 bg-black bg-opacity-70 text-white p-3 text-center">
                  {currentItem.caption}
                </div>
              )}
              
              {/* Counter */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                {selectedIndex + 1} / {filteredMediaItems.length}
              </div>
            </div>
            
            {/* Media thumbnails */}
            {filteredMediaItems.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2 max-w-5xl">
                {filteredMediaItems.map((item, index) => {
                  if (item.type === 'photo') {
                    return (
                      <div 
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(index);
                        }}
                        className={`cursor-pointer flex-shrink-0 transition-opacity ${
                          selectedIndex === index 
                            ? 'ring-2 ring-indigo-500 opacity-100' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={getImageUrl(item.content)}
                          alt={item.caption || `Thumbnail ${index + 1}`} 
                          className="h-20 w-20 object-cover rounded"
                          onError={(e) => {
                            e.target.src = getFallbackImageUrl();
                          }}
                        />
                      </div>
                    );
                  } else {
                    // For notes, show a thumbnail representation
                    return (
                      <div 
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(index);
                        }}
                        className={`cursor-pointer flex-shrink-0 transition-opacity ${
                          selectedIndex === index 
                            ? 'ring-2 ring-indigo-500 opacity-100' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="h-20 w-20 bg-gray-700 rounded flex items-center justify-center text-xs text-white p-1 overflow-hidden">
                          {item.caption || item.content.substring(0, 30)}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </>
        ) : (
          <div className="text-white text-lg">No media items available</div>
        )}
      </div>
      
      {/* Bottom info bar */}
      <div className="bg-gray-900 text-white py-2 px-4 text-xs flex justify-between items-center">
        <div>
          {currentItem && currentItem.dateCreated && (
            <span>Taken: {new Date(currentItem.dateCreated).toLocaleString()}</span>
          )}
        </div>
        <div>
          Press ← → to navigate, ESC to close, i to toggle info
        </div>
      </div>
    </div>
  );
};

AlbumOverlay.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mediaItems: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      caption: PropTypes.string,
      dateCreated: PropTypes.string
    })
  ),
  title: PropTypes.string,
  description: PropTypes.string,
  initialIndex: PropTypes.number
};

export default AlbumOverlay;
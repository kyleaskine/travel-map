import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';

/**
 * Enhanced AlbumView component that displays a collection of albums
 * and their contents in a gallery-like interface
 */
const AlbumView = ({
  isOpen,
  onClose,
  albums = [],
  selectedAlbumId = null,
  title,
  description
}) => {
  // State management
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [infoVisible, setInfoVisible] = useState(true);
  const [viewMode, setViewMode] = useState('album'); // 'album' or 'media'
  
  // Effect to reset indices when albums change or component reopens
  useEffect(() => {
    if (isOpen && albums.length > 0) {
      // If a specific album is requested, find its index
      if (selectedAlbumId) {
        const index = albums.findIndex(album => album._id === selectedAlbumId);
        if (index !== -1) {
          setCurrentAlbumIndex(index);
        } else {
          setCurrentAlbumIndex(0);
        }
      } else {
        setCurrentAlbumIndex(0);
      }
      
      setCurrentMediaIndex(0);
      setViewMode('album');
    }
  }, [isOpen, albums, selectedAlbumId]);
  
  // Get the current album
  const currentAlbum = albums[currentAlbumIndex] || null;
  
  // Get the current media item (when in media view)
  const currentMedia = currentAlbum?.media?.[currentMediaIndex] || null;
  
  // Calculate total counts
  const totalAlbums = albums.length;
  const totalMediaInCurrentAlbum = currentAlbum?.media?.length || 0;
  
  // Navigation callbacks
  const nextAlbum = useCallback(() => {
    if (!totalAlbums) return;
    setCurrentAlbumIndex(prev => (prev === totalAlbums - 1) ? 0 : prev + 1);
    setCurrentMediaIndex(0); // Reset media index when changing albums
  }, [totalAlbums]);
  
  const prevAlbum = useCallback(() => {
    if (!totalAlbums) return;
    setCurrentAlbumIndex(prev => (prev === 0) ? totalAlbums - 1 : prev - 1);
    setCurrentMediaIndex(0); // Reset media index when changing albums
  }, [totalAlbums]);
  
  const nextMedia = useCallback(() => {
    if (!totalMediaInCurrentAlbum) return;
    setCurrentMediaIndex(prev => (prev === totalMediaInCurrentAlbum - 1) ? 0 : prev + 1);
  }, [totalMediaInCurrentAlbum]);
  
  const prevMedia = useCallback(() => {
    if (!totalMediaInCurrentAlbum) return;
    setCurrentMediaIndex(prev => (prev === 0) ? totalMediaInCurrentAlbum - 1 : prev - 1);
  }, [totalMediaInCurrentAlbum]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        if (viewMode === 'media') {
          // If in media view, go back to album view
          setViewMode('album');
        } else {
          // Otherwise close the component
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        if (viewMode === 'album') {
          nextAlbum();
        } else {
          nextMedia();
        }
      } else if (e.key === 'ArrowLeft') {
        if (viewMode === 'album') {
          prevAlbum();
        } else {
          prevMedia();
        }
      } else if (e.key === 'i') {
        setInfoVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, viewMode, nextAlbum, prevAlbum, nextMedia, prevMedia, onClose]);
  
  // Function to enter media view mode
  const enterMediaView = (mediaIndex) => {
    setCurrentMediaIndex(mediaIndex);
    setViewMode('media');
  };
  
  // If the overlay is not open or there are no albums, don't render anything
  if (!isOpen || !albums || albums.length === 0) {
    return null;
  }
  
  // Helper function to get album cover image
  const getAlbumCoverImage = (album) => {
    if (!album || !album.media || album.media.length === 0) {
      return getFallbackImageUrl();
    }
    
    // Find the first photo in the album
    const firstPhoto = album.media.find(item => item.type === 'photo');
    if (firstPhoto) {
      return getImageUrl(firstPhoto.content);
    }
    
    return getFallbackImageUrl();
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col"
      onClick={() => {
        if (viewMode === 'media') {
          setViewMode('album');
        } else {
          onClose();
        }
      }}
    >
      {/* Header */}
      <div 
        className="bg-gray-900 text-white p-4 flex justify-between items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-xl font-semibold">
            {viewMode === 'album' 
              ? (title || 'Albums') 
              : (currentAlbum?.name || 'Media')}
          </h2>
          <p className="text-sm text-gray-300">
            {viewMode === 'album'
              ? (description || `${totalAlbums} albums available`)
              : (currentAlbum?.description || '')}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex space-x-2">
          {viewMode === 'media' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('album');
              }}
              className="p-2 text-gray-300 hover:text-white"
              aria-label="Back to album view"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setInfoVisible(!infoVisible);
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 text-gray-300 hover:text-white"
            aria-label="Close gallery"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      {viewMode === 'album' ? (
        /* Album Grid View */
        <div 
          className="flex-grow p-4 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-6xl mx-auto">
            {totalAlbums > 0 && (
              <>
                {/* Current Album Display */}
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <h3 className="text-white text-lg font-medium flex-grow">
                      {currentAlbum?.name || 'Album'}
                    </h3>
                    <div className="text-gray-400 text-sm">
                      Album {currentAlbumIndex + 1} of {totalAlbums}
                    </div>
                  </div>
                  
                  {/* Album Navigation */}
                  <div className="relative">
                    {/* Album Cover Image */}
                    <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                      <img 
                        src={getAlbumCoverImage(currentAlbum)}
                        alt={currentAlbum?.name || 'Album cover'}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = getFallbackImageUrl();
                        }}
                      />
                      
                      {/* Album Info Overlay */}
                      {infoVisible && currentAlbum && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4">
                          <h4 className="text-lg font-medium">{currentAlbum.name}</h4>
                          {currentAlbum.description && (
                            <p className="text-sm mt-1">{currentAlbum.description}</p>
                          )}
                          <div className="text-sm text-gray-300 mt-1">
                            {currentAlbum.media?.length || 0} media items
                          </div>
                        </div>
                      )}
                      
                      {/* Navigation Controls */}
                      {totalAlbums > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              prevAlbum();
                            }}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center"
                            aria-label="Previous album"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextAlbum();
                            }}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center"
                            aria-label="Next album"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Album Media Grid */}
                  {currentAlbum?.media && currentAlbum.media.length > 0 ? (
                    <div className="mt-6 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {currentAlbum.media.map((media, idx) => (
                        <div 
                          key={idx}
                          className="cursor-pointer group"
                          onClick={() => enterMediaView(idx)}
                        >
                          {media.type === 'photo' ? (
                            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden relative">
                              <img
                                src={getImageUrl(media.content)}
                                alt={media.caption || `Photo ${idx + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                onError={(e) => {
                                  e.target.src = getFallbackImageUrl();
                                }}
                              />
                            </div>
                          ) : (
                            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-3 text-white group-hover:bg-gray-700 transition-colors">
                              <div className="text-sm overflow-hidden max-h-full line-clamp-6">
                                {media.content}
                              </div>
                            </div>
                          )}
                          
                          {media.caption && (
                            <div className="mt-1 text-gray-300 text-sm truncate">
                              {media.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                      This album is empty
                    </div>
                  )}
                </div>
                
                {/* Other Albums (Thumbnails) */}
                {totalAlbums > 1 && (
                  <div className="mt-8">
                    <h4 className="text-white text-md font-medium mb-4">Other Albums</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {albums.map((album, idx) => (
                        idx !== currentAlbumIndex && (
                          <div
                            key={album._id || idx}
                            className="cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setCurrentAlbumIndex(idx)}
                          >
                            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                              <img
                                src={getAlbumCoverImage(album)}
                                alt={album.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = getFallbackImageUrl();
                                }}
                              />
                            </div>
                            <h5 className="text-white text-sm mt-1">{album.name}</h5>
                            <div className="text-xs text-gray-400">
                              {album.media?.length || 0} items
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Media Detail View */
        <div 
          className="flex-grow flex flex-col items-center justify-center p-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main media display */}
          <div className="relative max-w-5xl max-h-[70vh] flex items-center justify-center">
            {currentMedia?.type === 'photo' ? (
              <img 
                src={getImageUrl(currentMedia.content)}
                alt={currentMedia.caption || `Image ${currentMediaIndex + 1}`} 
                className="max-w-full max-h-[70vh] object-contain"
                onError={(e) => {
                  console.error("Failed to load image:", currentMedia.content);
                  e.target.src = getFallbackImageUrl();
                }}
              />
            ) : (
              <div className="bg-white bg-opacity-10 p-6 rounded-lg max-w-full max-h-[70vh] overflow-auto">
                <div className="text-white whitespace-pre-wrap">
                  {currentMedia?.content || 'No content available'}
                </div>
              </div>
            )}

            {/* Navigation arrows */}
            {totalMediaInCurrentAlbum > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevMedia();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl bg-black bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center"
                  aria-label="Previous media"
                >
                  ←
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextMedia();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl bg-black bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center"
                  aria-label="Next media"
                >
                  →
                </button>
              </>
            )}
            
            {/* Caption overlay */}
            {infoVisible && currentMedia?.caption && (
              <div className="absolute left-0 right-0 bottom-0 bg-black bg-opacity-70 text-white p-3 text-center">
                {currentMedia.caption}
              </div>
            )}
            
            {/* Counter */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
              {currentMediaIndex + 1} / {totalMediaInCurrentAlbum}
            </div>
          </div>
          
          {/* Thumbnails */}
          {totalMediaInCurrentAlbum > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 max-w-5xl">
              {currentAlbum?.media.map((item, index) => {
                // Skip notes in the thumbnail view
                if (item.type !== 'photo') return null;
                
                return (
                  <div 
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMediaIndex(index);
                    }}
                    className={`cursor-pointer flex-shrink-0 transition-opacity ${
                      currentMediaIndex === index 
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
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Bottom info bar */}
      <div className="bg-gray-900 text-white py-2 px-4 text-xs flex justify-between items-center">
        <div>
          {viewMode === 'media' && currentMedia?.dateCreated && (
            <span>Taken: {new Date(currentMedia.dateCreated).toLocaleString()}</span>
          )}
        </div>
        <div>
          {viewMode === 'album' 
            ? "← → to navigate albums, ESC to close, i to toggle info" 
            : "← → to navigate media, ESC to go back, i to toggle info"}
        </div>
      </div>
    </div>
  );
};

AlbumView.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  albums: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      media: PropTypes.arrayOf(
        PropTypes.shape({
          type: PropTypes.string.isRequired,
          content: PropTypes.string.isRequired,
          caption: PropTypes.string,
          dateCreated: PropTypes.string
        })
      )
    })
  ),
  selectedAlbumId: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string
};

export default AlbumView;
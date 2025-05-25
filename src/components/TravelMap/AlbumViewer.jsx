import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { getImageUrl, getFallbackImageUrl } from "../../utils/imageUtils";
import AlbumAPI from "../../services/albumApi";
import SafeImage from "./SafeImage";
import ZoomableImage from "./ZoomableImage";

/**
 * Unified AlbumViewer component that handles both direct media viewing and album browsing
 * Replaces both AlbumOverlay and AlbumView components
 */
const AlbumViewer = ({
  isOpen,
  onClose,
  // For simple media viewing (legacy AlbumOverlay behavior)
  mediaItems,
  // For album browsing (legacy AlbumView behavior)
  albums = [],
  selectedAlbumId = null,
  // Common props
  title,
  description,
  onAlbumUpdated,
  initialIndex = 0,
  mode = "auto" // 'media', 'albums', or 'auto' (auto-detect based on props)
}) => {
  // Determine mode based on props if set to auto
  const viewerMode = mode === "auto" 
    ? (albums && albums.length > 0 ? "albums" : "media")
    : mode;

  // State management
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(initialIndex);
  const [infoVisible, setInfoVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [viewType, setViewType] = useState('all'); // For filtering photos/notes

  // Album browsing state (only used in albums mode)
  const [loadedAlbums, setLoadedAlbums] = useState([]);
  const [albumMediaItems, setAlbumMediaItems] = useState([]);
  const [viewMode, setViewMode] = useState("album"); // 'album' or 'media' within albums mode

  // Refs
  const isMounted = useRef(true);
  const loadInProgress = useRef(false);
  const previousAlbumId = useRef(null);

  // Get media items based on mode
  const currentMediaItems = viewerMode === "albums" ? albumMediaItems : mediaItems;

  // Reset component when it opens or props change
  useEffect(() => {
    if (isOpen) {
      isMounted.current = true;
      
      if (viewerMode === "albums" && albums.length > 0) {
        setViewMode("album");
        setLoadedAlbums(albums);
        
        // Find selected album index
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
        setLoadingError(null);
      } else if (viewerMode === "media") {
        setCurrentMediaIndex(initialIndex);
        
        // Auto-detect media types
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
    }

    return () => {
      isMounted.current = false;
    };
  }, [isOpen, albums, selectedAlbumId, viewerMode, mediaItems, initialIndex]);

  // Load album with media (albums mode only)
  const loadAlbumWithMedia = useCallback(async (albumId) => {
    if (!albumId || loadInProgress.current || !isMounted.current) return;
    if (previousAlbumId.current === albumId && loadInProgress.current) return;

    console.log(`Loading album ${albumId} with media items...`);
    previousAlbumId.current = albumId;
    loadInProgress.current = true;

    setIsLoading(true);
    setLoadingError(null);

    try {
      const albumData = await AlbumAPI.getAlbumById(albumId);
      
      if (!isMounted.current) {
        console.log("Component unmounted during album load");
        return;
      }

      // Sort media items
      const mediaItemsArray = albumData.mediaItems ? [...albumData.mediaItems] : [];
      mediaItemsArray.sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined && a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        const dateA = new Date(a.dateCreated || 0);
        const dateB = new Date(b.dateCreated || 0);
        return dateA - dateB;
      });

      // Update loaded albums
      setLoadedAlbums(prev => {
        const updated = [...prev];
        const index = updated.findIndex(a => a._id === albumId);
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            ...albumData,
            mediaItems: mediaItemsArray
          };
        } else {
          updated.push({
            ...albumData,
            mediaItems: mediaItemsArray
          });
        }
        return updated;
      });

      setAlbumMediaItems(mediaItemsArray);
    } catch (error) {
      console.error(`Error loading album ${albumId}:`, error);
      if (isMounted.current) {
        setLoadingError(`Failed to load album: ${error.message}`);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      loadInProgress.current = false;
    }
  }, []);

  // Load album when current album changes (albums mode)
  useEffect(() => {
    if (!isOpen || viewerMode !== "albums" || loadedAlbums.length === 0) return;

    const currentAlbum = loadedAlbums[currentAlbumIndex];
    if (currentAlbum && currentAlbum._id && !loadInProgress.current) {
      if (currentAlbum.mediaItems && currentAlbum.mediaItems.length > 0) {
        console.log("Using already loaded media items:", currentAlbum.mediaItems.length);
        setAlbumMediaItems(currentAlbum.mediaItems);
      } else {
        loadAlbumWithMedia(currentAlbum._id);
      }
    }
  }, [isOpen, currentAlbumIndex, loadedAlbums, loadAlbumWithMedia, viewerMode]);

  // Filter media items based on view type
  const filteredMediaItems = viewType === 'all' 
    ? currentMediaItems 
    : viewType === 'photos' 
      ? currentMediaItems?.filter(item => item.type === 'photo') 
      : currentMediaItems?.filter(item => item.type === 'note');

  // Get current album (albums mode)
  const currentAlbum = viewerMode === "albums" ? loadedAlbums[currentAlbumIndex] || null : null;

  // Get current media item
  const currentMedia = filteredMediaItems?.[currentMediaIndex] || null;

  // Calculate counts
  const totalAlbums = loadedAlbums.length;
  const photoCount = currentMediaItems?.filter(item => item.type === 'photo').length || 0;
  const noteCount = currentMediaItems?.filter(item => item.type === 'note').length || 0;
  const totalMediaInCurrentView = filteredMediaItems?.length || 0;

  // Navigation callbacks
  const nextAlbum = useCallback(() => {
    if (!totalAlbums) return;
    setCurrentAlbumIndex(prev => (prev === totalAlbums - 1 ? 0 : prev + 1));
    setCurrentMediaIndex(0);
  }, [totalAlbums]);

  const prevAlbum = useCallback(() => {
    if (!totalAlbums) return;
    setCurrentAlbumIndex(prev => (prev === 0 ? totalAlbums - 1 : prev - 1));
    setCurrentMediaIndex(0);
  }, [totalAlbums]);

  const nextMedia = useCallback(() => {
    if (!totalMediaInCurrentView) return;
    setCurrentMediaIndex(prev => (prev === totalMediaInCurrentView - 1 ? 0 : prev + 1));
  }, [totalMediaInCurrentView]);

  const prevMedia = useCallback(() => {
    if (!totalMediaInCurrentView) return;
    setCurrentMediaIndex(prev => (prev === 0 ? totalMediaInCurrentView - 1 : prev - 1));
  }, [totalMediaInCurrentView]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (viewerMode === "albums" && viewMode === "media") {
          setViewMode("album");
        } else {
          onClose();
        }
      } else if (e.key === "ArrowRight") {
        if (viewerMode === "albums" && viewMode === "album") {
          nextAlbum();
        } else {
          nextMedia();
        }
      } else if (e.key === "ArrowLeft") {
        if (viewerMode === "albums" && viewMode === "album") {
          prevAlbum();
        } else {
          prevMedia();
        }
      } else if (e.key === "i") {
        setInfoVisible(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, viewerMode, viewMode, nextAlbum, prevAlbum, nextMedia, prevMedia, onClose]);

  // Enter media view (albums mode)
  const enterMediaView = (mediaIndex) => {
    setCurrentMediaIndex(mediaIndex);
    setViewMode("media");
  };

  // Set album cover
  const setAsCover = async (mediaId) => {
    if (!currentAlbum || !currentAlbum._id) return;

    try {
      await AlbumAPI.updateAlbum(currentAlbum._id, { coverImageId: mediaId });
      
      setLoadedAlbums(prev => {
        const updated = [...prev];
        const index = updated.findIndex(a => a._id === currentAlbum._id);
        if (index !== -1) {
          updated[index] = { ...updated[index], coverImageId: mediaId };
        }
        return updated;
      });

      if (onAlbumUpdated) onAlbumUpdated();
    } catch (error) {
      console.error("Failed to set cover image:", error);
      setLoadingError(`Failed to set cover image: ${error.message}`);
    }
  };

  // Helper to get album cover image
  const getAlbumCoverImage = (album) => {
    if (!album) return getFallbackImageUrl();

    if (album.coverImage) {
      return getImageUrl(album.coverImage.content);
    }

    if (album.coverImageId && album === currentAlbum && albumMediaItems.length > 0) {
      const coverItem = albumMediaItems.find(item => item._id === album.coverImageId);
      if (coverItem && coverItem.type === "photo") {
        return getImageUrl(coverItem.content);
      }
    }

    const firstPhoto = (album === currentAlbum ? albumMediaItems : album.mediaItems || [])
      .find(item => item.type === "photo");
    if (firstPhoto) {
      return getImageUrl(firstPhoto.content);
    }

    return getFallbackImageUrl();
  };

  if (!isOpen) return null;

  const isPhoto = currentMedia && currentMedia.type === "photo";
  const showingMediaView = viewerMode === "media" || (viewerMode === "albums" && viewMode === "media");

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col"
      onClick={() => {
        if (viewerMode === "albums" && viewMode === "media") {
          setViewMode("album");
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
            {showingMediaView && viewerMode === "albums" ? currentAlbum?.name || "Media" : title || "Media Gallery"}
          </h2>
          <p className="text-sm text-gray-300">
            {showingMediaView && viewerMode === "albums" 
              ? currentAlbum?.description || ""
              : description || (viewerMode === "albums" ? `${totalAlbums} albums available` : "")}
          </p>
        </div>

        <div className="flex space-x-2">
          {/* Media type filter */}
          {showingMediaView && photoCount > 0 && noteCount > 0 && (
            <div className="flex bg-gray-800 rounded-lg mr-2">
              <button
                onClick={() => { setViewType('all'); setCurrentMediaIndex(0); }}
                className={`px-2 py-1 text-sm rounded-l-lg ${
                  viewType === 'all' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setViewType('photos'); setCurrentMediaIndex(0); }}
                className={`px-2 py-1 text-sm ${
                  viewType === 'photos' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Photos ({photoCount})
              </button>
              <button
                onClick={() => { setViewType('notes'); setCurrentMediaIndex(0); }}
                className={`px-2 py-1 text-sm rounded-r-lg ${
                  viewType === 'notes' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Notes ({noteCount})
              </button>
            </div>
          )}

          {/* Back button for albums mode */}
          {viewerMode === "albums" && viewMode === "media" && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewMode("album"); }}
              className="p-2 text-gray-300 hover:text-white"
              aria-label="Back to album view"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setInfoVisible(!infoVisible); }}
            className="p-2 text-gray-300 hover:text-white"
            aria-label={infoVisible ? "Hide info" : "Show info"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d={infoVisible ? "M13 10V3L4 14h7v7l9-11h-7z" : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 text-gray-300 hover:text-white"
            aria-label="Close gallery"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Album Grid View (albums mode only) */}
      {viewerMode === "albums" && viewMode === "album" && (
        <div className="flex-grow p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="max-w-6xl mx-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : loadingError ? (
              <div className="bg-red-600 text-white p-4 rounded">
                {loadingError}
                <button
                  className="mt-2 px-3 py-1 bg-white text-red-600 rounded text-sm"
                  onClick={() => { setLoadingError(null); loadAlbumWithMedia(currentAlbum?._id); }}
                >
                  Retry
                </button>
              </div>
            ) : totalAlbums > 0 && (
              <>
                {/* Current Album Display */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white text-lg font-medium">{currentAlbum?.name || "Album"}</h3>
                    <div className="text-gray-400 text-sm">Album {currentAlbumIndex + 1} of {totalAlbums}</div>
                  </div>

                  {/* Album Navigation */}
                  {totalAlbums > 1 && (
                    <div className="flex justify-between items-center mb-3 bg-gray-800 rounded-lg p-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); prevAlbum(); }}
                        className="bg-gray-700 text-white px-3 py-1 rounded flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Previous Album</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextAlbum(); }}
                        className="bg-gray-700 text-white px-3 py-1 rounded flex items-center space-x-1"
                      >
                        <span>Next Album</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Album Cover */}
                  <div 
                    className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (albumMediaItems.length > 0) {
                        const firstPhotoIndex = albumMediaItems.findIndex(item => item.type === "photo");
                        enterMediaView(firstPhotoIndex !== -1 ? firstPhotoIndex : 0);
                      }
                    }}
                  >
                    <SafeImage
                      src={getAlbumCoverImage(currentAlbum)}
                      alt={currentAlbum?.name || "Album cover"}
                      className="w-full h-full object-contain"
                    />
                    {infoVisible && currentAlbum && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4">
                        <h4 className="text-lg font-medium">{currentAlbum.name}</h4>
                        {currentAlbum.description && <p className="text-sm mt-1">{currentAlbum.description}</p>}
                        <div className="text-sm text-gray-300 mt-1">
                          {photoCount} photos, {noteCount} notes
                        </div>
                      </div>
                    )}
                    {albumMediaItems.length > 0 && (
                      <div className="absolute top-2 right-2 bg-blue-500 bg-opacity-80 text-white text-xs rounded px-2 py-1">
                        Click to view
                      </div>
                    )}
                  </div>

                  {/* Media Grid */}
                  {albumMediaItems.length > 0 ? (
                    <div className="mt-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {albumMediaItems.map((media, idx) => (
                        <div
                          key={media._id || idx}
                          className="cursor-pointer group relative"
                          onClick={() => enterMediaView(idx)}
                        >
                          {media.type === "photo" ? (
                            <>
                              <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                                <SafeImage
                                  src={getImageUrl(media.content)}
                                  alt={media.caption || `Photo ${idx + 1}`}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-center">
                                  <span className="truncate">{media.caption || `Photo ${idx + 1}`}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setAsCover(media._id); }}
                                    className="bg-blue-600 text-white text-xs rounded px-1"
                                  >
                                    Cover
                                  </button>
                                </div>
                              </div>
                              {currentAlbum.coverImageId === media._id && (
                                <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs rounded px-1">
                                  Cover
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-3 text-white group-hover:bg-gray-700 transition-colors">
                              <div className="text-sm overflow-hidden max-h-full line-clamp-6">
                                {media.content.substring(0, 100)}
                                {media.content.length > 100 ? "..." : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                      {isLoading ? "Loading album contents..." : "This album is empty"}
                    </div>
                  )}
                </div>

                {/* Other Albums */}
                {totalAlbums > 1 && (
                  <div className="mt-8">
                    <h4 className="text-white text-md font-medium mb-4">Other Albums</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {loadedAlbums.map((album, idx) => 
                        idx !== currentAlbumIndex && (
                          <div
                            key={album._id || idx}
                            className="cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setCurrentAlbumIndex(idx)}
                          >
                            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                              <SafeImage
                                src={getAlbumCoverImage(album)}
                                alt={album.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <h5 className="text-white text-sm mt-1">{album.name}</h5>
                            <div className="text-xs text-gray-400">
                              {album.totalItems || album.mediaItems?.length || 0} items
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Media Detail View (both modes) */}
      {showingMediaView && (
        <div className="flex-grow flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Navigation controls */}
          {totalMediaInCurrentView > 1 && (
            <div className="flex justify-between items-center px-4 py-2 bg-gray-800">
              <button
                onClick={(e) => { e.stopPropagation(); prevMedia(); }}
                className="bg-gray-700 text-white px-4 py-2 rounded flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>
              <div className="text-gray-300 text-sm">
                {currentMediaIndex + 1} / {totalMediaInCurrentView}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); nextMedia(); }}
                className="bg-gray-700 text-white px-4 py-2 rounded flex items-center space-x-1"
              >
                <span>Next</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Media display */}
          <div className="flex-grow flex items-center justify-center p-4">
            <div className="relative max-w-5xl max-h-[70vh] flex items-center justify-center">
              {currentMedia?.type === "photo" ? (
                <ZoomableImage
                  src={getImageUrl(currentMedia.content)}
                  alt={currentMedia.caption || `Image ${currentMediaIndex + 1}`}
                  className="max-w-full max-h-[70vh]"
                  zoomLevel={2.5}
                />
              ) : (
                <div className="bg-white bg-opacity-10 p-6 rounded-lg max-w-full max-h-[70vh] overflow-auto">
                  <div className="text-white whitespace-pre-wrap">
                    {currentMedia?.content || "No content available"}
                  </div>
                </div>
              )}

              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                {currentMediaIndex + 1} / {totalMediaInCurrentView}
              </div>

              {/* Set as cover button (albums mode only) */}
              {viewerMode === "albums" && isPhoto && (
                <div className="absolute top-2 left-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setAsCover(currentMedia._id); }}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Set as Cover
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          {infoVisible && currentMedia?.caption && (
            <div className="mx-auto mb-4 bg-black bg-opacity-70 text-white p-3 text-center rounded max-w-5xl w-auto">
              {currentMedia.caption}
            </div>
          )}

          {/* Thumbnails */}
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 max-w-full justify-center mx-auto">
              {filteredMediaItems?.map((item, index) => (
                <div
                  key={item._id || index}
                  onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(index); }}
                  className={`cursor-pointer flex-shrink-0 transition-opacity ${
                    currentMediaIndex === index 
                      ? "ring-2 ring-indigo-500 opacity-100" 
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {item.type === "photo" ? (
                    <SafeImage
                      src={getImageUrl(item.content)}
                      alt={item.caption || `Thumbnail ${index + 1}`}
                      className="h-20 w-20 object-cover rounded"
                    />
                  ) : (
                    <div className="h-20 w-20 bg-gray-700 rounded flex items-center justify-center text-xs text-white p-1 overflow-hidden">
                      {item.caption || item.content.substring(0, 30)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom info bar */}
      <div className="bg-gray-900 text-white py-2 px-4 text-xs flex justify-between items-center">
        <div>
          {showingMediaView && currentMedia?.dateCreated && (
            <span>Created: {new Date(currentMedia.dateCreated).toLocaleString()}</span>
          )}
        </div>
        <div>
          {viewerMode === "albums" && viewMode === "album"
            ? "← → to navigate albums, Enter to view media, ESC to close"
            : "← → to navigate media, ESC to go back"}
        </div>
      </div>
    </div>
  );
};

AlbumViewer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  // For media mode
  mediaItems: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      caption: PropTypes.string,
      dateCreated: PropTypes.string
    })
  ),
  // For albums mode
  albums: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      coverImage: PropTypes.object,
      mediaItems: PropTypes.array,
      coverImageId: PropTypes.string,
    })
  ),
  selectedAlbumId: PropTypes.string,
  // Common
  title: PropTypes.string,
  description: PropTypes.string,
  onAlbumUpdated: PropTypes.func,
  initialIndex: PropTypes.number,
  mode: PropTypes.oneOf(['media', 'albums', 'auto'])
};

export default AlbumViewer;
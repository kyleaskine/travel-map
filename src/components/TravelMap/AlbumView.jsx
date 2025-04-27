import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { getImageUrl, getFallbackImageUrl } from "../../utils/imageUtils";
import AlbumAPI from "../../services/albumApi";
import SafeImage from "./SafeImage"; // Import our new SafeImage component
import ZoomableImage from "./ZoomableImage";

/**
 * Enhanced AlbumView component for viewing album contents
 * Supports the new album-centric architecture
 */
const AlbumView = ({
  isOpen,
  onClose,
  albums = [],
  selectedAlbumId = null,
  title,
  description,
  onAlbumUpdated,
}) => {
  // State management
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [infoVisible, setInfoVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  // Album and media state
  const [loadedAlbums, setLoadedAlbums] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [viewMode, setViewMode] = useState("album"); // 'album' or 'media'

  // Refs to prevent state updates during unmounting or duplicate loads
  const isMounted = useRef(true);
  const loadInProgress = useRef(false);
  const previousAlbumId = useRef(null);

  // Reset the component when albums change or the overlay opens/closes
  useEffect(() => {
    if (isOpen) {
      isMounted.current = true;

      if (albums.length > 0) {
        // Reset view mode when albums change
        setViewMode("album");
        setLoadedAlbums(albums);

        // If a specific album is requested, find its index
        if (selectedAlbumId) {
          const index = albums.findIndex(
            (album) => album._id === selectedAlbumId
          );
          if (index !== -1) {
            setCurrentAlbumIndex(index);
          } else {
            setCurrentAlbumIndex(0);
          }
        } else {
          setCurrentAlbumIndex(0);
        }

        // Reset media index and error state
        setCurrentMediaIndex(0);
        setLoadingError(null);
      }
    }

    // Cleanup function for unmounting
    return () => {
      isMounted.current = false;
    };
  }, [isOpen, albums, selectedAlbumId]);

  // Load album with all its media items
  const loadAlbumWithMedia = useCallback(async (albumId) => {
    // Skip if no albumId or already loading or component unmounted
    if (!albumId || loadInProgress.current || !isMounted.current) return;

    // Skip if we're reloading the same album that's already in progress
    if (previousAlbumId.current === albumId && loadInProgress.current) return;

    // Log what we're doing
    console.log(`Loading album ${albumId} with media items...`);

    previousAlbumId.current = albumId;
    loadInProgress.current = true;

    setIsLoading(true);
    setLoadingError(null);

    try {
      // Get complete album data with media items
      const albumData = await AlbumAPI.getAlbumById(albumId);

      console.log(
        `Album ${albumId} loaded successfully with`,
        albumData.mediaItems ? albumData.mediaItems.length : 0,
        "media items"
      );

      // Guard against unmounting during async operation
      if (!isMounted.current) {
        console.log("Component unmounted during album load, abandoning update");
        return;
      }

      // Ensure media items is always an array and sort by dateCreated in ascending order (oldest first)
      const mediaItemsArray = albumData.mediaItems
        ? [...albumData.mediaItems]
        : [];
      mediaItemsArray.sort((a, b) => {
        // First sort by any manual sortOrder if available
        if (
          a.sortOrder !== undefined &&
          b.sortOrder !== undefined &&
          a.sortOrder !== b.sortOrder
        ) {
          return a.sortOrder - b.sortOrder;
        }
        // Then sort by dateCreated (oldest first)
        const dateA = new Date(a.dateCreated || 0);
        const dateB = new Date(b.dateCreated || 0);
        return dateA - dateB;
      });

      // Update loaded albums with the new data
      setLoadedAlbums((prevAlbums) => {
        const updatedAlbums = [...prevAlbums];
        const index = updatedAlbums.findIndex((a) => a._id === albumId);

        if (index !== -1) {
          updatedAlbums[index] = {
            ...updatedAlbums[index],
            ...albumData,
            mediaItems: mediaItemsArray,
          };
        } else {
          updatedAlbums.push({
            ...albumData,
            mediaItems: mediaItemsArray,
          });
        }

        return updatedAlbums;
      });

      // Set media items for the current album
      setMediaItems(mediaItemsArray);
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

  // Load album media when current album changes
  useEffect(() => {
    // Only proceed if component is open and we have albums
    if (!isOpen || loadedAlbums.length === 0) return;

    // Get the current album
    const currentAlbum = loadedAlbums[currentAlbumIndex];

    // Only load if we have a valid album and it's not already loading
    if (currentAlbum && currentAlbum._id && !loadInProgress.current) {
      // If the album already has mediaItems array and it's not empty, no need to load again
      if (currentAlbum.mediaItems && currentAlbum.mediaItems.length > 0) {
        console.log(
          "Using already loaded media items:",
          currentAlbum.mediaItems.length
        );
        setMediaItems(currentAlbum.mediaItems);
      } else {
        // Otherwise, load the album with media items
        loadAlbumWithMedia(currentAlbum._id);
      }
    }
  }, [isOpen, currentAlbumIndex, loadedAlbums, loadAlbumWithMedia]);

  // Get the current album
  const currentAlbum = loadedAlbums[currentAlbumIndex] || null;

  // Get the current media item (when in media view)
  const currentMedia = mediaItems[currentMediaIndex] || null;

  // Calculate total counts
  const totalAlbums = loadedAlbums.length;
  const photoCount =
    mediaItems.length > 0
      ? mediaItems.filter((item) => item.type === "photo").length
      : currentAlbum?.photoCount || 0;

  const noteCount =
    mediaItems.length > 0
      ? mediaItems.filter((item) => item.type === "note").length
      : currentAlbum?.noteCount || 0;

  const totalCount =
    mediaItems.length > 0 ? mediaItems.length : currentAlbum?.totalItems || 0;

  const totalMediaInCurrentAlbum = totalCount;

  // Navigation callbacks
  const nextAlbum = useCallback(() => {
    if (!totalAlbums) return;
    setCurrentAlbumIndex((prev) => (prev === totalAlbums - 1 ? 0 : prev + 1));
    setCurrentMediaIndex(0); // Reset media index when changing albums
  }, [totalAlbums]);

  const prevAlbum = useCallback(() => {
    if (!totalAlbums) return;
    setCurrentAlbumIndex((prev) => (prev === 0 ? totalAlbums - 1 : prev - 1));
    setCurrentMediaIndex(0); // Reset media index when changing albums
  }, [totalAlbums]);

  const nextMedia = useCallback(() => {
    if (!totalMediaInCurrentAlbum) return;
    setCurrentMediaIndex((prev) =>
      prev === totalMediaInCurrentAlbum - 1 ? 0 : prev + 1
    );
  }, [totalMediaInCurrentAlbum]);

  const prevMedia = useCallback(() => {
    if (!totalMediaInCurrentAlbum) return;
    setCurrentMediaIndex((prev) =>
      prev === 0 ? totalMediaInCurrentAlbum - 1 : prev - 1
    );
  }, [totalMediaInCurrentAlbum]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (viewMode === "media") {
          // If in media view, go back to album view
          setViewMode("album");
        } else {
          // Otherwise close the component
          onClose();
        }
      } else if (e.key === "ArrowRight") {
        if (viewMode === "album") {
          nextAlbum();
        } else {
          nextMedia();
        }
      } else if (e.key === "ArrowLeft") {
        if (viewMode === "album") {
          prevAlbum();
        } else {
          prevMedia();
        }
      } else if (e.key === "i") {
        setInfoVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, viewMode, nextAlbum, prevAlbum, nextMedia, prevMedia, onClose]);

  // Function to enter media view mode
  const enterMediaView = (mediaIndex) => {
    setCurrentMediaIndex(mediaIndex);
    setViewMode("media");
  };

  // Function to set an image as album cover
  const setAsCover = async (mediaId) => {
    if (!currentAlbum || !currentAlbum._id) return;

    try {
      await AlbumAPI.updateAlbum(currentAlbum._id, {
        coverImageId: mediaId,
      });

      // Update local state
      setLoadedAlbums((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((a) => a._id === currentAlbum._id);
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            coverImageId: mediaId,
          };
        }
        return updated;
      });

      // If callback provided, notify parent
      if (onAlbumUpdated) {
        onAlbumUpdated();
      }
    } catch (error) {
      console.error("Failed to set cover image:", error);
      setLoadingError(`Failed to set cover image: ${error.message}`);
    }
  };

  // If the overlay is not open or there are no albums, don't render anything
  if (!isOpen || !loadedAlbums || loadedAlbums.length === 0) {
    return null;
  }

  // Helper function to get album cover image
  const getAlbumCoverImage = (album) => {
    if (!album) return getFallbackImageUrl();

    // Use coverImage from album if it already includes the image object
    if (album.coverImage) {
      return getImageUrl(album.coverImage.content);
    }

    // For albums loaded with getAlbumById, find the media item by coverImageId
    if (album.coverImageId && album === currentAlbum && mediaItems.length > 0) {
      const coverItem = mediaItems.find(
        (item) => item._id === album.coverImageId
      );
      if (coverItem && coverItem.type === "photo") {
        return getImageUrl(coverItem.content);
      }
    }

    // Find the first photo in mediaItems if this is the current album
    if (album === currentAlbum && mediaItems.length > 0) {
      const firstPhoto = mediaItems.find((item) => item.type === "photo");
      if (firstPhoto) {
        return getImageUrl(firstPhoto.content);
      }
    }

    // Find the first photo in album.mediaItems if available
    if (album.mediaItems && album.mediaItems.length > 0) {
      const firstPhoto = album.mediaItems.find((item) => item.type === "photo");
      if (firstPhoto) {
        return getImageUrl(firstPhoto.content);
      }
    }

    return getFallbackImageUrl();
  };

  // Determine if this is a photo or note
  const isPhoto = currentMedia && currentMedia.type === "photo";

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col"
      onClick={() => {
        if (viewMode === "media") {
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
            {viewMode === "album"
              ? title || "Albums"
              : currentAlbum?.name || "Media"}
          </h2>
          <p className="text-sm text-gray-300">
            {viewMode === "album"
              ? description || `${totalAlbums} albums available`
              : currentAlbum?.description || ""}
          </p>
        </div>

        {/* Controls */}
        <div className="flex space-x-2">
          {viewMode === "media" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewMode("album");
              }}
              className="p-2 text-gray-300 hover:text-white"
              aria-label="Back to album view"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                />
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
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={
                  infoVisible
                    ? "M13 10V3L4 14h7v7l9-11h-7z"
                    : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                }
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
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === "album" ? (
        /* Album Grid View */
        <div
          className="flex-grow p-4 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
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
                  onClick={() => {
                    setLoadingError(null);
                    loadAlbumWithMedia(currentAlbum?._id);
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              totalAlbums > 0 && (
                <>
                  {/* Current Album Display */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white text-lg font-medium">
                        {currentAlbum?.name || "Album"}
                      </h3>
                      <div className="text-gray-400 text-sm">
                        Album {currentAlbumIndex + 1} of {totalAlbums}
                      </div>
                    </div>

                    {/* Album Navigation */}
                    <div className="relative">
                      {/* Album Cover Image */}
                      <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                        <SafeImage
                          src={getAlbumCoverImage(currentAlbum)}
                          alt={currentAlbum?.name || "Album cover"}
                          className="w-full h-full object-contain"
                        />

                        {/* Album Info Overlay */}
                        {infoVisible && currentAlbum && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4">
                            <h4 className="text-lg font-medium">
                              {currentAlbum.name}
                            </h4>
                            {currentAlbum.description && (
                              <p className="text-sm mt-1">
                                {currentAlbum.description}
                              </p>
                            )}
                            <div className="text-sm text-gray-300 mt-1">
                              {photoCount} photos, {noteCount} notes
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
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 19l-7-7 7-7"
                                />
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
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Media Type Filter */}
                    {(photoCount > 0 || noteCount > 0) && (
                      <div className="flex space-x-2 mt-4 mb-2">
                        <button
                          className="px-3 py-1 rounded text-sm bg-white text-gray-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          All ({totalCount})
                        </button>
                        {photoCount > 0 && (
                          <button
                            className="px-3 py-1 rounded text-sm bg-gray-800 text-white hover:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Photos ({photoCount})
                          </button>
                        )}
                        {noteCount > 0 && (
                          <button
                            className="px-3 py-1 rounded text-sm bg-gray-800 text-white hover:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Notes ({noteCount})
                          </button>
                        )}
                      </div>
                    )}

                    {/* Album Media Grid */}
                    {mediaItems.length > 0 ? (
                      <div className="mt-2 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {mediaItems.map((media, idx) => {
                          if (media.type === "photo") {
                            return (
                              <div
                                key={media._id || idx}
                                className="cursor-pointer group relative"
                                onClick={() => enterMediaView(idx)}
                              >
                                <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                                  <SafeImage
                                    src={getImageUrl(media.content)}
                                    alt={media.caption || `Photo ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                </div>

                                {/* Caption and set as cover button */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex justify-between items-center">
                                    <span className="truncate">
                                      {media.caption || `Photo ${idx + 1}`}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAsCover(media._id);
                                      }}
                                      className="bg-blue-600 text-white text-xs rounded px-1"
                                      title="Set as album cover"
                                    >
                                      Cover
                                    </button>
                                  </div>
                                </div>

                                {/* Cover indicator */}
                                {currentAlbum.coverImageId === media._id && (
                                  <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs rounded px-1">
                                    Cover
                                  </div>
                                )}
                              </div>
                            );
                          } else {
                            // For notes, show a thumbnail representation
                            return (
                              <div
                                key={media._id || idx}
                                className="cursor-pointer group"
                                onClick={() => enterMediaView(idx)}
                              >
                                <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-3 text-white group-hover:bg-gray-700 transition-colors">
                                  <div className="text-sm overflow-hidden max-h-full line-clamp-6">
                                    {media.content.substring(0, 100)}
                                    {media.content.length > 100 ? "..." : ""}
                                  </div>
                                </div>

                                {media.caption && (
                                  <div className="mt-1 text-gray-300 text-sm truncate">
                                    {media.caption}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    ) : (
                      <div className="mt-6 bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                        {isLoading
                          ? "Loading album contents..."
                          : "This album is empty"}
                      </div>
                    )}
                  </div>

                  {/* Other Albums (Thumbnails) */}
                  {totalAlbums > 1 && (
                    <div className="mt-8">
                      <h4 className="text-white text-md font-medium mb-4">
                        Other Albums
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {loadedAlbums.map(
                          (album, idx) =>
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
                                <h5 className="text-white text-sm mt-1">
                                  {album.name}
                                </h5>
                                <div className="text-xs text-gray-400">
                                  {album.totalItems ||
                                    album.mediaItems?.length ||
                                    0}{" "}
                                  items
                                </div>
                              </div>
                            )
                        )}
                      </div>
                    </div>
                  )}
                </>
              )
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

            {/* Set as cover button for photos */}
            {isPhoto && (
              <div className="absolute top-2 left-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAsCover(currentMedia._id);
                  }}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                  title="Set as album cover"
                >
                  Set as Cover
                </button>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {totalMediaInCurrentAlbum > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 max-w-5xl">
              {mediaItems.map((item, index) => {
                // For photos, show image thumbnails
                if (item.type === "photo") {
                  return (
                    <div
                      key={item._id || index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentMediaIndex(index);
                      }}
                      className={`cursor-pointer flex-shrink-0 transition-opacity ${
                        currentMediaIndex === index
                          ? "ring-2 ring-indigo-500 opacity-100"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <SafeImage
                        src={getImageUrl(item.content)}
                        alt={item.caption || `Thumbnail ${index + 1}`}
                        className="h-20 w-20 object-cover rounded"
                      />
                    </div>
                  );
                }

                // For notes, show a text thumbnail
                return (
                  <div
                    key={item._id || index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMediaIndex(index);
                    }}
                    className={`cursor-pointer flex-shrink-0 transition-opacity ${
                      currentMediaIndex === index
                        ? "ring-2 ring-indigo-500 opacity-100"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="h-20 w-20 bg-gray-700 rounded flex items-center justify-center text-xs text-white p-1 overflow-hidden">
                      {item.caption || item.content.substring(0, 30)}
                    </div>
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
          {viewMode === "media" && currentMedia?.dateCreated && (
            <span>
              Created: {new Date(currentMedia.dateCreated).toLocaleString()}
            </span>
          )}
        </div>
        <div>
          {viewMode === "album"
            ? "← → to navigate albums, Enter to view media, ESC to close"
            : "← → to navigate media, ESC to go back to albums"}
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
      coverImage: PropTypes.object,
      mediaItems: PropTypes.array,
      coverImageId: PropTypes.string,
    })
  ),
  selectedAlbumId: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  onAlbumUpdated: PropTypes.func,
};

export default AlbumView;
import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { formatDate } from "../../utils/dateUtils";

/**
 * Enhanced MediaViewer component inspired by PhotoGallery
 * Provides a rich viewing experience for travel media
 */
const EnhancedMediaViewer = ({ item, onClose }) => {
  // States
  const [activeTab, setActiveTab] = useState("photos");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Group media by type
  const photos = item?.media?.filter(m => m.type === "photo") || [];
  const notes = item?.media?.filter(m => m.type === "note") || [];
  
  // Set initial active tab based on available media
  useEffect(() => {
    if (photos.length > 0) {
      setActiveTab("photos");
    } else if (notes.length > 0) {
      setActiveTab("notes");
    }
  }, [photos.length, notes.length]);
  
  // Navigation functions
  const nextItem = useCallback(() => {
    if (activeTab === "photos" && photos.length > 0) {
      setCurrentIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
    }
  }, [activeTab, photos.length]);
  
  const prevItem = useCallback(() => {
    if (activeTab === "photos" && photos.length > 0) {
      setCurrentIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
    }
  }, [activeTab, photos.length]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (activeTab === "photos") {
        if (e.key === "ArrowRight") {
          nextItem();
        } else if (e.key === "ArrowLeft") {
          prevItem();
        } else if (e.key === "f") {
          setIsFullscreen(!isFullscreen);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, nextItem, prevItem, isFullscreen, onClose]);
  
  if (!item || !item.media || item.media.length === 0) {
    return null;
  }
  
  // Determine title and subtitle based on item type
  let title = '';
  let subtitle = '';
  let dateInfo = '';
  
  if (item.transport) { // It's a segment
    title = item.transport;
    subtitle = `${item.origin.name} → ${item.destination.name}`;
    dateInfo = item.date ? formatDate(item.date) : '';
  } else { // It's a stay
    title = item.location;
    subtitle = item.notes || '';
    dateInfo = item.dateStart && item.dateEnd ? 
      `${formatDate(item.dateStart)} - ${formatDate(item.dateEnd)}` : '';
  }
  
  // Get current photo being displayed
  const currentPhoto = activeTab === "photos" && photos.length > currentIndex 
    ? photos[currentIndex] 
    : null;
  
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col ${
      isFullscreen ? 'fullscreen-mode' : ''
    }`}>
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-gray-300">{subtitle}</p>
          {dateInfo && <p className="text-xs text-gray-400">{dateInfo}</p>}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-300 hover:text-white focus:outline-none"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              )}
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white focus:outline-none"
            aria-label="Close viewer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-gray-800 flex items-center px-4">
        <button
          onClick={() => setActiveTab("photos")}
          className={`px-4 py-3 text-sm font-medium focus:outline-none ${
            activeTab === "photos"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-white"
          }`}
          disabled={photos.length === 0}
        >
          Photos ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-3 text-sm font-medium focus:outline-none ${
            activeTab === "notes"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-white"
          }`}
          disabled={notes.length === 0}
        >
          Notes ({notes.length})
        </button>
      </div>
      
      {/* Content Area */}
      <div className="flex-grow overflow-auto p-4">
        {activeTab === "photos" && (
          <div className="h-full flex flex-col">
            {photos.length > 0 ? (
              <>
                {/* Main Photo Viewer */}
                <div className="flex-grow flex items-center justify-center relative mb-4">
                  <img
                    src={photos[currentIndex].content}
                    alt={photos[currentIndex].caption || "Photo"}
                    className="max-h-full max-w-full object-contain"
                  />
                  
                  {/* Navigation arrows */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prevItem}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center focus:outline-none"
                        aria-label="Previous photo"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={nextItem}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center focus:outline-none"
                        aria-label="Next photo"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                  
                  {/* Caption */}
                  {photos[currentIndex].caption && (
                    <div className="absolute left-0 right-0 bottom-0 bg-black bg-opacity-70 text-white p-3 text-center">
                      {photos[currentIndex].caption}
                    </div>
                  )}
                  
                  {/* Photo counter */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                    {currentIndex + 1} / {photos.length}
                  </div>
                  
                  {/* Date taken - if available */}
                  {photos[currentIndex].dateCreated && (
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      {new Date(photos[currentIndex].dateCreated).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                {/* Thumbnails */}
                {photos.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`cursor-pointer flex-shrink-0 transition ${
                          currentIndex === idx 
                            ? "ring-2 ring-blue-500 opacity-100" 
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={photo.content}
                          alt={photo.caption || `Thumbnail ${idx + 1}`}
                          className="h-16 w-16 object-cover rounded"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-white">
                No photos available
              </div>
            )}
          </div>
        )}
        
        {activeTab === "notes" && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {notes.length > 0 ? (
              notes.map((note, idx) => (
                <div key={idx} className="bg-white bg-opacity-10 text-white p-4 rounded-lg">
                  {note.caption && (
                    <h3 className="font-medium text-lg mb-2 text-blue-300">{note.caption}</h3>
                  )}
                  <div className="whitespace-pre-wrap">{note.content}</div>
                  {note.dateCreated && (
                    <div className="text-gray-400 text-sm mt-2">
                      {new Date(note.dateCreated).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-white">
                No notes available
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom info bar - for displaying additional context */}
      <div className="bg-gray-900 text-white py-2 px-4 text-xs">
        <div className="flex justify-between items-center">
          <div>
            {activeTab === "photos" && currentPhoto && currentPhoto.dateCreated && (
              <span>Taken: {new Date(currentPhoto.dateCreated).toLocaleString()}</span>
            )}
          </div>
          <div>
            {isFullscreen ? "Press ESC or F to exit fullscreen" : "Press F for fullscreen, arrows to navigate"}
          </div>
        </div>
      </div>
    </div>
  );
};

EnhancedMediaViewer.propTypes = {
  item: PropTypes.shape({
    media: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        caption: PropTypes.string,
        dateCreated: PropTypes.string
      })
    ).isRequired,
    // For segments
    transport: PropTypes.string,
    origin: PropTypes.shape({
      name: PropTypes.string
    }),
    destination: PropTypes.shape({
      name: PropTypes.string
    }),
    date: PropTypes.string,
    // For stays
    location: PropTypes.string,
    notes: PropTypes.string,
    dateStart: PropTypes.string,
    dateEnd: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};

export default EnhancedMediaViewer;
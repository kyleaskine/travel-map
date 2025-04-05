import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * MediaViewer component for displaying a full-screen media gallery
 */
const MediaViewer = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState("photos");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
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
  
  // Photo navigation
  const nextPhoto = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentPhotoIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);
  
  const prevPhoto = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentPhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (activeTab === "photos") {
        if (e.key === "ArrowRight") {
          nextPhoto();
        } else if (e.key === "ArrowLeft") {
          prevPhoto();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, nextPhoto, prevPhoto, onClose]);
  
  if (!item || !item.media || item.media.length === 0) {
    return null;
  }
  
  let title = '';
  let subtitle = '';
  
  if (item.transport) { // It's a segment
    title = item.transport;
    subtitle = `${item.origin.name} → ${item.destination.name}`;
  } else { // It's a stay
    title = item.location;
    subtitle = item.notes || '';
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-gray-300">{subtitle}</p>
        </div>
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
                    src={photos[currentPhotoIndex].content}
                    alt={photos[currentPhotoIndex].caption || "Photo"}
                    className="max-h-full max-w-full object-contain"
                  />
                  
                  {/* Navigation arrows */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center focus:outline-none"
                        aria-label="Previous photo"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center focus:outline-none"
                        aria-label="Next photo"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                  
                  {/* Caption */}
                  {photos[currentPhotoIndex].caption && (
                    <div className="absolute left-0 right-0 bottom-0 bg-black bg-opacity-70 text-white p-2 text-center">
                      {photos[currentPhotoIndex].caption}
                    </div>
                  )}
                  
                  {/* Photo counter */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                </div>
                
                {/* Thumbnails */}
                {photos.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`cursor-pointer flex-shrink-0 ${
                          currentPhotoIndex === idx 
                            ? "ring-2 ring-blue-500" 
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={photo.content}
                          alt={photo.caption || `Thumbnail ${idx + 1}`}
                          className="h-16 w-16 object-cover"
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
          <div className="space-y-4">
            {notes.length > 0 ? (
              notes.map((note, idx) => (
                <div key={idx} className="bg-white bg-opacity-10 text-white p-4 rounded-lg">
                  {note.caption && (
                    <h3 className="font-medium text-lg mb-2">{note.caption}</h3>
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
    </div>
  );
};

MediaViewer.propTypes = {
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
    // For stays
    location: PropTypes.string,
    notes: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};

export default MediaViewer;
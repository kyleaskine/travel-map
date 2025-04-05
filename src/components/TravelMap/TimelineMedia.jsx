import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * TimelineMedia component to display photos and notes for timeline items
 */
const TimelineMedia = ({ media, itemType, itemName }) => {
  const [activeTab, setActiveTab] = useState('photos');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  
  // Filter media by type
  const photos = media?.filter(item => item.type === 'photo') || [];
  const notes = media?.filter(item => item.type === 'note') || [];
  
  // Handle photo click to open lightbox
  const handlePhotoClick = (index) => {
    setSelectedPhotoIndex(index);
    setLightboxOpen(true);
  };
  
  // Navigate through photos in lightbox - use useCallback to memoize these functions
  const nextPhoto = useCallback(() => {
    setSelectedPhotoIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);
  
  const prevPhoto = useCallback(() => {
    setSelectedPhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  // Handle keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        nextPhoto();
      } else if (e.key === 'ArrowLeft') {
        prevPhoto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, nextPhoto, prevPhoto]);
  
  if (!media || media.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No media available for this {itemType}.
      </div>
    );
  }
  
  return (
    <div className="timeline-media mt-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'photos'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Photos ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'notes'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Notes ({notes.length})
          </button>
        </nav>
      </div>
      
      {/* Photos Tab Content */}
      {activeTab === 'photos' && (
        <div className="grid grid-cols-3 gap-2">
          {photos.length > 0 ? (
            photos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handlePhotoClick(index)}
              >
                <img
                  src={photo.content}
                  alt={photo.caption || `${itemName} photo ${index + 1}`}
                  className="object-cover w-full h-full rounded"
                />
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-gray-500 py-4">
              No photos available.
            </div>
          )}
        </div>
      )}
      
      {/* Notes Tab Content */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {notes.length > 0 ? (
            notes.map((note, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded">
                {note.caption && (
                  <h4 className="font-medium text-sm mb-1">{note.caption}</h4>
                )}
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                {note.dateCreated && (
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(note.dateCreated).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              No notes available.
            </div>
          )}
        </div>
      )}
      
      {/* Lightbox for Photos */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-screen" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-white text-2xl z-10 bg-black bg-opacity-50 w-10 h-10 rounded-full flex items-center justify-center"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close lightbox"
            >
              ×
            </button>
            
            {/* Main image */}
            <img
              src={photos[selectedPhotoIndex].content}
              alt={photos[selectedPhotoIndex].caption || `Photo ${selectedPhotoIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain mx-auto"
            />
            
            {/* Caption */}
            {photos[selectedPhotoIndex].caption && (
              <div className="absolute left-0 right-0 bottom-4 flex justify-center text-white bg-black bg-opacity-50 py-2 px-4 rounded">
                <p>{photos[selectedPhotoIndex].caption}</p>
              </div>
            )}
            
            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl bg-black bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center"
                  aria-label="Previous photo"
                >
                  ←
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl bg-black bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center"
                  aria-label="Next photo"
                >
                  →
                </button>
              </>
            )}
            
            {/* Photo counter */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {selectedPhotoIndex + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

TimelineMedia.propTypes = {
  media: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['photo', 'note']).isRequired,
      content: PropTypes.string.isRequired,
      caption: PropTypes.string,
      dateCreated: PropTypes.string
    })
  ),
  itemType: PropTypes.string.isRequired,
  itemName: PropTypes.string.isRequired
};

export default TimelineMedia;
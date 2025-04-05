import React, { useState } from "react";
import PropTypes from "prop-types";
import { segmentDetailStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";

/**
 * AccommodationDetail component with built-in media management
 */
const AccommodationDetail = ({ accommodation, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('details');
  
  // Local state for media
  const [mediaList, setMediaList] = useState(accommodation.media || []);
  
  // Media upload form state
  const [mediaType, setMediaType] = useState('photo');
  const [caption, setCaption] = useState('');
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  
  if (!accommodation) return null;
  
  // Generate a consistent ID for the stay
  const stayId = `stay-${accommodation.location.replace(/\s+/g, '-').toLowerCase()}`;
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      let newMedia = {
        type: mediaType,
        caption: caption,
        dateCreated: new Date().toISOString()
      };
      
      if (mediaType === 'photo') {
        if (!photoFile) {
          setUploadMessage('Please select a photo');
          return;
        }
        
        // Create path: /images/stays/[id]/[filename]
        const fileName = photoFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const relativePath = `/images/stays/${stayId}/${fileName}`;
        
        // Store the path
        newMedia.content = relativePath;
        
        // Show instructions for manually copying files
        setUploadMessage(
          `Success! For testing, copy your photo to: public${relativePath}`
        );
        
        console.log(`UPLOAD: To test, manually copy the selected file to: public${relativePath}`);
      } else {
        // For notes, just store the content directly
        if (!content.trim()) {
          setUploadMessage('Please enter some note content');
          return;
        }
        newMedia.content = content;
        setUploadMessage('Note added successfully');
      }
      
      // Add to local state
      const updatedMedia = [...mediaList, newMedia];
      setMediaList(updatedMedia);
      
      // Important: Update the parent component's state
      if (onUpdate) {
        // Create an updated accommodation object
        const updatedAccommodation = {
          ...accommodation,
          media: updatedMedia
        };
        onUpdate(updatedAccommodation);
      }
      
      // Clear form
      setCaption('');
      setContent('');
      setPhotoFile(null);
      setPhotoPreview('');
      
    } catch (error) {
      console.error('Error adding media:', error);
      setUploadMessage(`Error: ${error.message}`);
    }
  };
  
  // Handle photo file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      
      // Preview the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{
      ...segmentDetailStyles.container,
      borderLeft: "4px solid #8800ff",
      width: "320px", // Wider to accommodate form
      maxHeight: "450px",
      overflowY: "auto"
    }}>
      <div style={segmentDetailStyles.header}>
        <h3 style={segmentDetailStyles.title}>
          {accommodation.location}
        </h3>
        <button
          style={segmentDetailStyles.closeButton}
          onClick={onClose}
          aria-label="Close details"
        >
          ✕
        </button>
      </div>
      
      <div style={segmentDetailStyles.date}>
        {formatDate(accommodation.dateStart)} - {formatDate(accommodation.dateEnd)}
      </div>
      
      <div style={segmentDetailStyles.typeIndicator}>
        <div style={{
          width: "1rem",
          height: "1rem",
          backgroundColor: "#8800ff",
          borderRadius: "9999px",
          marginRight: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{
            color: "white",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}>
            H
          </span>
        </div>
        <div style={segmentDetailStyles.typeText}>
          Accommodation
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mt-3 mb-3">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-3 text-sm font-medium ${
              activeTab === 'details'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`py-2 px-3 text-sm font-medium ${
              activeTab === 'media'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Media
            {mediaList.length > 0 && (
              <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                {mediaList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-3 text-sm font-medium ${
              activeTab === 'upload'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload
          </button>
        </nav>
      </div>
      
      {/* Details Tab Content */}
      {activeTab === 'details' && (
        <div style={segmentDetailStyles.details}>
          {accommodation.notes && (
            <div style={segmentDetailStyles.detailItem}>
              <strong>Notes:</strong> {accommodation.notes}
            </div>
          )}
          <div style={segmentDetailStyles.detailItem}>
            <strong>Coordinates:</strong> {accommodation.coordinates[0].toFixed(4)}, {accommodation.coordinates[1].toFixed(4)}
          </div>
          {accommodation.amenities && (
            <div style={segmentDetailStyles.detailItem}>
              <strong>Amenities:</strong> {accommodation.amenities.join(', ')}
            </div>
          )}
        </div>
      )}
      
      {/* Media Tab Content */}
      {activeTab === 'media' && (
        <div className="p-2">
          {mediaList.length > 0 ? (
            <div>
              <h4 className="font-medium mb-2">Media Items:</h4>
              <div className="space-y-3">
                {mediaList.map((media, index) => (
                  <div key={index} className="border rounded p-2">
                    <div className="font-medium">{media.type === 'photo' ? '📷 Photo' : '📝 Note'}</div>
                    {media.caption && (
                      <div className="text-sm font-medium mt-1">{media.caption}</div>
                    )}
                    
                    {media.type === 'photo' ? (
                      <div className="mt-1">
                        <img 
                          src={media.content} 
                          alt={media.caption || 'Photo'} 
                          className="max-h-32 object-contain"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                            e.target.style.backgroundColor = '#f0f0f0';
                          }}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Path: {media.content}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm bg-gray-50 p-2 rounded">
                        {media.content}
                      </div>
                    )}
                    
                    {media.dateCreated && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(media.dateCreated).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No media items available. Add some in the Upload tab.
            </div>
          )}
        </div>
      )}
      
      {/* Upload Tab Content */}
      {activeTab === 'upload' && (
        <div className="p-2">
          {uploadMessage && (
            <div className={`mb-3 p-2 rounded text-sm ${
              uploadMessage.startsWith('Error') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {uploadMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Media Type Selection */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Media Type
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="mediaType"
                    value="photo"
                    checked={mediaType === 'photo'}
                    onChange={() => setMediaType('photo')}
                  />
                  <span className="ml-2">Photo</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="mediaType"
                    value="note"
                    checked={mediaType === 'note'}
                    onChange={() => setMediaType('note')}
                  />
                  <span className="ml-2">Note</span>
                </label>
              </div>
            </div>
            
            {/* Caption */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caption
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Enter a caption (optional)"
              />
            </div>
            
            {/* Content - conditionally show based on media type */}
            {mediaType === 'photo' ? (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full"
                  onChange={handleFileChange}
                />
                {photoPreview && (
                  <div className="mt-2">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="h-32 object-contain"
                    />
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  For testing, photos will be saved to:<br/>
                  <span className="font-mono">public/images/stays/{stayId}/</span>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Content
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="4"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note here..."
                ></textarea>
              </div>
            )}
            
            {/* Submit Button */}
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Add Media
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

AccommodationDetail.propTypes = {
  accommodation: PropTypes.shape({
    location: PropTypes.string.isRequired,
    dateStart: PropTypes.string.isRequired,
    dateEnd: PropTypes.string.isRequired,
    notes: PropTypes.string,
    coordinates: PropTypes.arrayOf(PropTypes.number).isRequired,
    amenities: PropTypes.arrayOf(PropTypes.string),
    media: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        caption: PropTypes.string,
        dateCreated: PropTypes.string
      })
    )
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func
};

export default AccommodationDetail;
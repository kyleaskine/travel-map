import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { segmentDetailStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";
import MediaAPI from "../../services/mediaApi";
import AlbumAPI from "../../services/albumApi";
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';
import AlbumManager from "./AlbumManager";
import AlbumView from "./AlbumView";

/**
 * Enhanced AccommodationDetail component with albums support
 * Fixed to properly update when switching between different accommodations
 * Fixed to prevent duplicate album creations
 */
const AccommodationDetail = ({ accommodation, onClose, onUpdate, tripId }) => {
  const [activeTab, setActiveTab] = useState('details');
  
  // Local state for media and albums
  const [mediaList, setMediaList] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  
  // Album view state
  const [albumViewOpen, setAlbumViewOpen] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  
  // Media upload form state
  const [mediaType, setMediaType] = useState('photo');
  const [caption, setCaption] = useState('');
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Extract item ID for API calls
  const getItemId = useCallback(() => {
    if (!accommodation) return null;
    // Use MongoDB _id if available, otherwise use location-based ID
    return accommodation._id || `stay-${accommodation.location.replace(/\s+/g, '-').toLowerCase()}`;
  }, [accommodation]);
  
  // Function to load albums
  const loadAlbums = useCallback(async () => {
    if (!tripId || !accommodation) return;
    
    const itemId = getItemId();
    if (!itemId) return;
    
    setIsLoadingAlbums(true);
    try {
      const albumData = await AlbumAPI.getAlbumsByItem(tripId, 'stay', itemId);
      console.log(`Loaded ${albumData.length} albums for stay ${itemId}`);
      setAlbums(albumData);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [tripId, accommodation, getItemId]);
  
  // Update media list when accommodation changes
  useEffect(() => {
    if (accommodation && accommodation.media) {
      console.log(`Updating media list for ${accommodation.location}, found ${accommodation.media.length} items`);
      setMediaList(accommodation.media || []);
    } else {
      setMediaList([]);
    }
  }, [accommodation]);
  
  // Load albums when accommodation changes
  useEffect(() => {
    if (tripId && accommodation) {
      loadAlbums();
    }
  }, [tripId, accommodation, loadAlbums]);
  
  if (!accommodation) return null;
  
  // Handle form submission - updated to use MediaAPI
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadMessage('');
    
    try {
      let newMedia = {
        type: mediaType,
        caption: caption,
        dateCreated: new Date().toISOString()
      };
      
      if (mediaType === 'photo') {
        if (!photoFile) {
          setUploadMessage('Please select a photo');
          setIsUploading(false);
          return;
        }
        
        // Upload the photo first using MediaAPI
        try {
          const uploadResult = await MediaAPI.uploadPhoto(photoFile);
          newMedia.content = uploadResult.url; // Use the URL returned from the server
          console.log('Photo uploaded successfully:', uploadResult);
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          
          // Fallback for development: create a path like we did before
          const fileName = photoFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const relativePath = `/uploads/stays/${getItemId()}/${fileName}`;
          newMedia.content = relativePath;
          
          console.log(`UPLOAD: To test, manually copy the selected file to: public${relativePath}`);
          setUploadMessage(`Using test path since backend call failed. Copy your photo to: public${relativePath}`);
        }
        
      } else {
        // For notes, just store the content directly
        if (!content.trim()) {
          setUploadMessage('Please enter some note content');
          setIsUploading(false);
          return;
        }
        newMedia.content = content;
      }
      
      // Try to save the media to the backend using MediaAPI
      let savedMedia = newMedia;
      
      try {
        // Only attempt API call if we have valid IDs
        if (tripId) {
          const mediaResult = await MediaAPI.addMediaToStay(tripId, getItemId(), newMedia);
          savedMedia = mediaResult.media || newMedia;
          console.log('Media saved to backend:', mediaResult);
        } else {
          console.warn('Missing tripId, skipping backend save');
        }
      } catch (apiError) {
        console.error('API error when saving media:', apiError);
      }
      
      // Add to local state
      const updatedMedia = [...mediaList, savedMedia];
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
      
      // Set success message
      setUploadMessage(`${mediaType === 'photo' ? 'Photo' : 'Note'} added successfully!`);
      
      // Clear form
      setCaption('');
      setContent('');
      setPhotoFile(null);
      setPhotoPreview('');
      
    } catch (error) {
      console.error('Error adding media:', error);
      setUploadMessage(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
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
  
  // Handle album creation - THIS FUNCTION NOW MAKES THE API CALL
  const handleAlbumCreated = async (albumData) => {
    try {
      console.log('Creating album with data:', albumData);
      
      // Make sure the album has the correct itemId
      const albumToCreate = {
        ...albumData,
        itemType: 'stay',
        itemId: getItemId()
      };
      
      // Actually save the album to the backend
      const savedAlbum = await AlbumAPI.createAlbum(albumToCreate);
      
      console.log('Album saved to backend:', savedAlbum);
      
      // Update local albums state
      setAlbums(prevAlbums => [...prevAlbums, savedAlbum]);
      
      return savedAlbum;
    } catch (error) {
      console.error('Error creating album:', error);
      throw error;
    }
  };
  
  // Handle album selection for viewing
  const handleAlbumSelected = (album) => {
    setSelectedAlbumId(album._id);
    setAlbumViewOpen(true);
  };

  return (
    <>
      <div style={{
        ...segmentDetailStyles.container,
        borderLeft: "4px solid #8800ff",
        width: "360px", // Wider to accommodate form and albums
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
              onClick={() => setActiveTab('albums')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'albums'
                  ? 'border-b-2 border-purple-500 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Albums
              {albums.length > 0 && (
                <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                  {albums.length}
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
            {accommodation._id && (
              <div style={segmentDetailStyles.detailItem}>
                <strong>ID:</strong> {accommodation._id}
              </div>
            )}
            {accommodation.amenities && accommodation.amenities.length > 0 && (
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
                <h4 className="font-medium mb-2">Media Items ({mediaList.length}):</h4>
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
                            src={getImageUrl(media.content)}
                            alt={media.caption || 'Photo'} 
                            className="max-h-32 object-contain cursor-pointer"
                            onClick={() => setAlbumViewOpen(true)}
                            onError={(e) => {
                              console.error("Failed to load image:", media.content);
                              e.target.src = getFallbackImageUrl();
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
        
        {/* Albums Tab Content */}
        {activeTab === 'albums' && (
          <div className="p-2">
            {isLoadingAlbums ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <AlbumManager
                tripId={tripId}
                itemType="stay"
                itemId={getItemId()}
                media={mediaList}
                albums={albums}
                onAlbumCreated={handleAlbumCreated}
                onAlbumSelected={handleAlbumSelected}
              />
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
                    Photos will be uploaded to the server and saved with this accommodation.
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
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Add Media'}
              </button>
            </form>
          </div>
        )}
      </div>
      
      {/* Album View (full-screen overlay) */}
      <AlbumView
        isOpen={albumViewOpen}
        onClose={() => setAlbumViewOpen(false)}
        albums={albums}
        selectedAlbumId={selectedAlbumId}
        title={`Albums for ${accommodation.location}`}
        description={`${formatDate(accommodation.dateStart)} - ${formatDate(accommodation.dateEnd)}`}
      />
    </>
  );
};

AccommodationDetail.propTypes = {
  accommodation: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string, // MongoDB ID from the backend
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
  onUpdate: PropTypes.func,
  tripId: PropTypes.string
};

export default AccommodationDetail;
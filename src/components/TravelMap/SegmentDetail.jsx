import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { segmentDetailStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";
import MediaAPI from "../../services/mediaApi";
import AlbumAPI from "../../services/albumApi";
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';
import AlbumManager from "./AlbumManager";
import AlbumView from "./AlbumView";

/**
 * Enhanced SegmentDetail component with albums support
 * Fixed to properly update when switching between different segments
 * Fixed to prevent map wheel scrolling when hovering over detail panel
 */
const SegmentDetail = ({ segment, onClose, onUpdate, tripId }) => {
  const [activeTab, setActiveTab] = useState('details');
  const detailContainerRef = useRef(null); // Ref for the container element
  
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
  
  // Function to load albums - wrapped in useCallback to prevent infinite render cycles
  const loadAlbums = useCallback(async () => {
    if (!tripId || !segment?.id) return;
    
    setIsLoadingAlbums(true);
    try {
      const albumData = await AlbumAPI.getAlbumsByItem(tripId, 'segment', segment.id);
      console.log(`Loaded ${albumData.length} albums for segment ${segment.id}`);
      setAlbums(albumData);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [tripId, segment?.id]);
  
  // Update media list when segment changes
  useEffect(() => {
    if (segment && segment.media) {
      console.log(`Updating media list for segment ${segment.id}, found ${segment.media?.length || 0} items`);
      setMediaList(segment.media || []);
    } else {
      setMediaList([]);
    }
  }, [segment]);
  
  // Load albums when the component mounts or when dependencies change
  useEffect(() => {
    if (tripId && segment && segment.id) {
      loadAlbums();
    }
  }, [tripId, segment, segment?.id, loadAlbums]);
  
  // Improved mouse wheel event handling to prevent scrolling map
  useEffect(() => {
    // Use the ref directly instead of querySelector
    const detailContainer = detailContainerRef.current;
    
    if (!detailContainer) {
      console.log("Detail container ref not available");
      return;
    }
    
    console.log("Adding wheel event listener to detail container");
    
    // Function to prevent wheel events from propagating to map
    const preventWheelPropagation = (e) => {
      // Stop the event from reaching the map
      e.stopPropagation();
      
      // Get current scroll position and limits
      const { scrollHeight, clientHeight, scrollTop } = detailContainer;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // -1 for rounding errors
      
      // If at the limits and trying to scroll further in that direction, let the map handle it
      // Otherwise, handle scrolling within the container
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        // At limits, allow default (map zoom)
        console.log("At scroll limit, allowing default");
      } else {
        // Not at limits, prevent default and handle scroll manually
        e.preventDefault();
        console.log("Handling scroll within container");
        
        // Manual scroll (smoother than letting the browser do it)
        detailContainer.scrollTop += e.deltaY;
      }
    };
    
    // Add event listener with capture phase to ensure it gets the event first
    detailContainer.addEventListener('wheel', preventWheelPropagation, { 
      passive: false,
      capture: true  // This is important to capture the event before it reaches other handlers
    });
    
    // Clean up function
    return () => {
      console.log("Removing wheel event listener");
      if (detailContainer) {
        detailContainer.removeEventListener('wheel', preventWheelPropagation, { 
          passive: false,
          capture: true
        });
      }
    };
  }, []);
  
  if (!segment) return null;
  
  // Handle form submission for adding media
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
          const relativePath = `/uploads/segments/${segment.id}/${fileName}`;
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
        // Only attempt API call if we have a valid tripId
        if (tripId) {
          const mediaResult = await MediaAPI.addMediaToSegment(tripId, segment.id, newMedia);
          savedMedia = mediaResult.media || newMedia;
          console.log('Media saved to backend:', mediaResult);
        } else {
          console.warn('No tripId provided, skipping backend save');
        }
      } catch (apiError) {
        console.error('API error when saving media:', apiError);
      }
      
      // Add to local state
      const updatedMedia = [...mediaList, savedMedia];
      setMediaList(updatedMedia);
      
      // Important: Update the parent component's state
      if (onUpdate) {
        // Create an updated segment object
        const updatedSegment = {
          ...segment,
          media: updatedMedia
        };
        onUpdate(updatedSegment);
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
  
  // Handle album creation
  const handleAlbumCreated = async (albumData) => {
    try {
      console.log('Creating album with data:', albumData);
      
      // Make sure the album has the correct itemId
      const albumToCreate = {
        ...albumData,
        itemType: 'segment',
        itemId: segment.id
      };
      
      // Make the API call here
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
      <div 
        ref={detailContainerRef} // Add the ref here
        style={{
          ...segmentDetailStyles.container,
          width: "360px", // Wider to accommodate form and albums
          maxHeight: "450px",
          overflowY: "auto"
        }}
      >
        <div style={segmentDetailStyles.header}>
          <h3 style={segmentDetailStyles.title}>
            {segment.transport}
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
          {formatDate(segment.date)}
        </div>
        
        <div style={segmentDetailStyles.typeIndicator}>
          <div style={segmentDetailStyles.typeDot(segment.type)}></div>
          <div style={segmentDetailStyles.typeText}>
            {segment.type}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mt-3 mb-3">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'media'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Media
              {mediaList.length > 0 && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  {mediaList.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('albums')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'albums'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Albums
              {albums.length > 0 && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  {albums.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-3 text-sm font-medium ${
                activeTab === 'upload'
                  ? 'border-b-2 border-blue-500 text-blue-600'
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
            <div style={segmentDetailStyles.detailItem}>
              <strong>From:</strong> {segment.origin.name}
              {segment.origin.code && ` (${segment.origin.code})`}
            </div>
            <div style={segmentDetailStyles.detailItem}>
              <strong>To:</strong> {segment.destination.name}
              {segment.destination.code && ` (${segment.destination.code})`}
            </div>
            {segment.notes && (
              <div style={segmentDetailStyles.detailItem}>
                <strong>Notes:</strong> {segment.notes}
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <AlbumManager
                tripId={tripId}
                itemType="segment"
                itemId={segment.id}
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
                    Photos will be uploaded to the server and saved with this segment.
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
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
        title={`Albums for ${segment.transport}`}
        description={`From ${segment.origin.name} to ${segment.destination.name}`}
      />
    </>
  );
};

SegmentDetail.propTypes = {
  segment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    transport: PropTypes.string.isRequired,
    origin: PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string,
      coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
    }).isRequired,
    destination: PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string,
      coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
    }).isRequired,
    notes: PropTypes.string,
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

export default SegmentDetail;
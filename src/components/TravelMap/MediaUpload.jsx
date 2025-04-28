import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import AlbumAPI from '../../services/albumApi';
import MediaAPI from '../../services/mediaApi';
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';

/**
 * Enhanced MediaUpload component with album selection
 * Allows uploading media directly to any album associated with an item
 */
const MediaUpload = ({ 
  tripId, 
  itemType, 
  itemId,
  onMediaAdded,
  onCancel,
  initialAlbumId = null,
}) => {
  // Media upload form state
  const [mediaType, setMediaType] = useState('photo');
  const [caption, setCaption] = useState('');
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  // Album selection state
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(initialAlbumId);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  
  // Form status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');  // 'success' or 'error'
  
  // Use a ref to track initialization status
  const isInitialized = useRef(false);
  
  // Load albums for this item on component mount
  useEffect(() => {
    // Define the async function inside the effect
    const loadAlbums = async () => {
      if (!tripId || !itemType || !itemId) return;
      
      setIsLoadingAlbums(true);
      
      try {
        const albumData = await AlbumAPI.getAlbumsByItem(tripId, itemType, itemId);
        console.log(`Loaded ${albumData.length} albums for ${itemType} ${itemId}`);
        setAlbums(albumData);
        
        // Only initialize the selected album once
        if (!isInitialized.current) {
          if (initialAlbumId) {
            setSelectedAlbumId(initialAlbumId);
          } else if (albumData.length > 0) {
            setSelectedAlbumId(albumData[0]._id);
          }
          isInitialized.current = true;
        }
      } catch (error) {
        console.error('Failed to load albums:', error);
        setMessage('Error loading albums. Please try again.');
        setMessageType('error');
      } finally {
        setIsLoadingAlbums(false);
      }
    };
    
    // Call the function
    loadAlbums();
    
    // Clean up function
    return () => {
      // Any cleanup if needed
    };
  }, [tripId, itemType, itemId, initialAlbumId]); // No selectedAlbumId dependency
  
  // Handle media upload form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedAlbumId) {
      setMessage('Please select an album first');
      setMessageType('error');
      return;
    }
    
    if (mediaType === 'photo' && !photoFile) {
      setMessage('Please select a photo');
      setMessageType('error');
      return;
    }
    
    if (mediaType === 'note' && !content.trim()) {
      setMessage('Please enter some note content');
      setMessageType('error');
      return;
    }
    
    // Prepare for submission
    setIsSubmitting(true);
    setMessage('');
    
    try {
      // Prepare the media object
      let newMedia = {
        type: mediaType,
        caption: caption,
      };
      
      if (mediaType === 'photo') {
        // Upload the photo first
        const uploadResult = await MediaAPI.uploadPhoto(photoFile);
        newMedia.content = uploadResult.url;
        console.log('Photo uploaded successfully:', uploadResult);
      } else {
        // For notes, use the text content
        newMedia.content = content;
      }
      
      // Add the media to the selected album
      const savedMedia = await MediaAPI.addMediaToAlbum(selectedAlbumId, newMedia);
      console.log('Media added to album:', savedMedia);
      
      // Notify parent component
      if (onMediaAdded) {
        onMediaAdded(savedMedia, selectedAlbumId);
      }
      
      // Reset form for next upload
      setCaption('');
      setContent('');
      setPhotoFile(null);
      setPhotoPreview('');
      
      // Show success message
      setMessage(`${mediaType === 'photo' ? 'Photo' : 'Note'} added successfully!`);
      setMessageType('success');
      
    } catch (error) {
      console.error('Error adding media:', error);
      setMessage(`Error: ${error.message || 'Failed to add media'}`);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
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
  
  // Handle album selection change
  const handleAlbumChange = (e) => {
    setSelectedAlbumId(e.target.value);
  };
  
  // Show album creation placeholder if no albums available
  const showCreateAlbumPlaceholder = !isLoadingAlbums && albums.length === 0;
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Add Media</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
      
      {/* Message display */}
      {message && (
        <div className={`mb-4 p-3 rounded text-sm ${
          messageType === 'error' 
            ? 'bg-red-100 text-red-700 border border-red-300' 
            : 'bg-green-100 text-green-700 border border-green-300'
        }`}>
          {message}
        </div>
      )}
      
      {showCreateAlbumPlaceholder ? (
        /* Display when no albums are available */
        <div className="text-center py-6 bg-gray-50 rounded-lg mb-4">
          <p className="text-gray-600 mb-2">No albums available for this item.</p>
          <p className="text-gray-500 mb-4">
            Please create an album first before adding media.
          </p>
          <button
            onClick={onCancel}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      ) : (
        /* Media upload form */
        <form onSubmit={handleSubmit}>
          {/* Album Selection Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Album
            </label>
            {isLoadingAlbums ? (
              <div className="flex items-center space-x-2 h-10">
                <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 rounded-full"></div>
                <span className="text-gray-500">Loading albums...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={selectedAlbumId || ''}
                  onChange={handleAlbumChange}
                  required
                >
                  <option value="" disabled>Select an album...</option>
                  {albums.map((album) => (
                    <option key={album._id} value={album._id}>
                      {album.name} {album.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          
          {/* Album preview if an album is selected */}
          {selectedAlbumId && albums.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                  {albums.find(a => a._id === selectedAlbumId)?.coverImage ? (
                    <img
                      src={getImageUrl(albums.find(a => a._id === selectedAlbumId).coverImage.content)}
                      alt="Album cover"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = getFallbackImageUrl();
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">
                    {albums.find(a => a._id === selectedAlbumId)?.name || 'Selected Album'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {albums.find(a => a._id === selectedAlbumId)?.description || 'No description'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {albums.find(a => a._id === selectedAlbumId)?.totalItems || 0} items
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Media Type Selection */}
          <div className="mb-4">
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
          <div className="mb-4">
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Photo
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full"
                onChange={handleFileChange}
                required
              />
              {photoPreview && (
                <div className="mt-2">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="h-40 object-contain"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Content
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="4"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                required
              ></textarea>
            </div>
          )}
          
          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            {onCancel && (
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting || isLoadingAlbums || !selectedAlbumId}
            >
              {isSubmitting ? 'Uploading...' : 'Upload Media'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

MediaUpload.propTypes = {
  tripId: PropTypes.string.isRequired,
  itemType: PropTypes.oneOf(['segment', 'stay']).isRequired,
  itemId: PropTypes.string.isRequired,
  onMediaAdded: PropTypes.func,
  onCancel: PropTypes.func,
  initialAlbumId: PropTypes.string
};

export default MediaUpload;
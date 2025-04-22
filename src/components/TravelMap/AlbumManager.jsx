import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';
import AlbumAPI from '../../services/albumApi';
import MediaAPI from '../../services/mediaApi';

/**
 * AlbumManager component for creating and managing media albums
 * Updated for album-centric architecture
 */
const AlbumManager = ({ 
  tripId, 
  itemType, 
  itemId,
  onAlbumCreated,
  onAlbumSelected,
  onRefreshNeeded,
  defaultOpen = false
}) => {
  // State for component sections
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(defaultOpen);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // Album state
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  
  // Media state
  const [mediaItems, setMediaItems] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  
  // Form state
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Media upload form state
  const [mediaType, setMediaType] = useState('photo');
  const [caption, setCaption] = useState('');
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  // Load albums for this item
  const loadAlbums = useCallback(async () => {
    if (!tripId || !itemType || !itemId) return;
    
    setIsLoadingAlbums(true);
    try {
      const albumData = await AlbumAPI.getAlbumsByItem(tripId, itemType, itemId);
      console.log(`Loaded ${albumData.length} albums for ${itemType} ${itemId}`);
      setAlbums(albumData);
      
      // If there's at least one album and none selected yet, select the first one
      if (albumData.length > 0 && !selectedAlbumId) {
        setSelectedAlbumId(albumData[0]._id);
      }
    } catch (error) {
      console.error('Failed to load albums:', error);
      setMessage(`Error loading albums: ${error.message}`);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [tripId, itemType, itemId, selectedAlbumId]);
  
  // Load media for the selected album
  const loadAlbumMedia = useCallback(async () => {
    if (!selectedAlbumId) return;
    
    setIsLoadingMedia(true);
    try {
      const mediaData = await MediaAPI.getMediaByAlbum(selectedAlbumId);
      console.log(`Loaded ${mediaData.length} media items for album ${selectedAlbumId}`);
      setMediaItems(mediaData);
    } catch (error) {
      console.error('Failed to load media:', error);
      setMessage(`Error loading media: ${error.message}`);
    } finally {
      setIsLoadingMedia(false);
    }
  }, [selectedAlbumId]);
  
  // Load albums on mount
  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);
  
  // Load media when selected album changes
  useEffect(() => {
    if (selectedAlbumId) {
      loadAlbumMedia();
    } else {
      setMediaItems([]);
    }
  }, [selectedAlbumId, loadAlbumMedia]);
  
  // Reset form when opening/closing album creation
  useEffect(() => {
    if (!isCreatingAlbum) {
      setNewAlbumName('');
      setNewAlbumDescription('');
      setMessage('');
    }
  }, [isCreatingAlbum]);
  
  // Handle form submission for creating a new album
  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    
    if (!newAlbumName.trim()) {
      setMessage('Please enter an album name');
      return;
    }
    
    if (!tripId) {
      setMessage('Trip ID is required to create an album');
      return;
    }
    
    if (!itemId) {
      setMessage('Item ID is required to create an album');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('');
    
    try {
      // Create the album data object
      const albumData = {
        name: newAlbumName,
        description: newAlbumDescription,
        tripId,
        relatedItem: {
          type: itemType,
          itemId
        },
        isDefault: albums.length === 0 // Make it default if it's the first album
      };
      
      console.log('Creating album with data:', albumData);
      
      // Create the album
      const createdAlbum = await AlbumAPI.createAlbum(albumData);
      console.log('Album created successfully:', createdAlbum);
      
      // Update local state
      setAlbums(prev => [...prev, createdAlbum]);
      setSelectedAlbumId(createdAlbum._id);
      
      // Call the callback
      if (onAlbumCreated) {
        onAlbumCreated(createdAlbum);
      }
      
      // Reset form and show success message
      setNewAlbumName('');
      setNewAlbumDescription('');
      setMessage('Album created successfully!');
      
      // Close the creation form after a delay
      setTimeout(() => {
        setIsCreatingAlbum(false);
        setMessage('');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating album:', error);
      setMessage(`Error: ${error.message || 'Failed to create album'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle album selection
  const handleAlbumClick = (albumId) => {
    setSelectedAlbumId(albumId);
    
    if (onAlbumSelected) {
      const selectedAlbum = albums.find(album => album._id === albumId);
      if (selectedAlbum) {
        onAlbumSelected(selectedAlbum);
      }
    }
  };
  
  // Handle media upload form submission
  const handleMediaUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedAlbumId) {
      setMessage('Please select an album first');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('');
    
    try {
      let newMedia = {
        type: mediaType,
        caption: caption,
      };
      
      if (mediaType === 'photo') {
        if (!photoFile) {
          setMessage('Please select a photo');
          setIsSubmitting(false);
          return;
        }
        
        // Upload the photo first
        const uploadResult = await MediaAPI.uploadPhoto(photoFile);
        newMedia.content = uploadResult.url;
        console.log('Photo uploaded successfully:', uploadResult);
      } else {
        // For notes
        if (!content.trim()) {
          setMessage('Please enter some note content');
          setIsSubmitting(false);
          return;
        }
        newMedia.content = content;
      }
      
      // Add the media to the album
      const savedMedia = await MediaAPI.addMediaToAlbum(selectedAlbumId, newMedia);
      console.log('Media added to album:', savedMedia);
      
      // Update local state
      setMediaItems(prev => [...prev, savedMedia]);
      
      // Reset form
      setCaption('');
      setContent('');
      setPhotoFile(null);
      setPhotoPreview('');
      
      // Show success message
      setMessage(`${mediaType === 'photo' ? 'Photo' : 'Note'} added successfully!`);
      
      // Close the upload form after a delay
      setTimeout(() => {
        setIsUploadingMedia(false);
        setMessage('');
        
        // Notify parent that refresh might be needed
        if (onRefreshNeeded) {
          onRefreshNeeded();
        }
      }, 1500);
      
    } catch (error) {
      console.error('Error adding media:', error);
      setMessage(`Error: ${error.message || 'Failed to add media'}`);
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
  
  // Create default album if none exists
  const handleCreateDefaultAlbum = async () => {
    if (!tripId || !itemType || !itemId) {
      setMessage('Missing required information to create default album');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('');
    
    try {
      const createdAlbum = await AlbumAPI.createDefaultAlbum(tripId, itemType, itemId);
      console.log('Default album created:', createdAlbum);
      
      // Update local state
      setAlbums(prev => [...prev, createdAlbum]);
      setSelectedAlbumId(createdAlbum._id);
      
      // Show success message
      setMessage('Default album created!');
      
      // Notify parent that refresh might be needed
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    } catch (error) {
      console.error('Failed to create default album:', error);
      setMessage(`Error: ${error.message || 'Failed to create default album'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Delete a media item
  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this media item?')) {
      return;
    }
    
    try {
      await MediaAPI.deleteMediaItem(mediaId);
      
      // Update local state
      setMediaItems(prev => prev.filter(item => item._id !== mediaId));
      
      // Notify parent that refresh might be needed
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      setMessage(`Error: ${error.message || 'Failed to delete media'}`);
    }
  };
  
  return (
    <div className="album-manager">
      {/* Message display */}
      {message && (
        <div className={`mb-3 p-2 rounded text-sm ${
          message.startsWith('Error') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}
      
      {/* Album Selection Section */}
      {!isCreatingAlbum && !isUploadingMedia && albums.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-lg">Albums</h3>
            <div className="flex space-x-2">
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                onClick={() => setIsCreatingAlbum(true)}
              >
                New Album
              </button>
              <button
                className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                onClick={() => setIsUploadingMedia(true)}
                disabled={!selectedAlbumId}
              >
                Add Media
              </button>
            </div>
          </div>
          
          {/* Album grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {albums.map((album) => (
              <div 
                key={album._id} 
                className={`border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                  selectedAlbumId === album._id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleAlbumClick(album._id)}
              >
                <div className="aspect-video overflow-hidden rounded-t-lg bg-gray-100">
                  {album.coverImage ? (
                    <img
                      src={getImageUrl(album.coverImage.content)}
                      alt={album.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = getFallbackImageUrl();
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No photos yet
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h4 className="font-medium text-sm">{album.name}</h4>
                  {album.description && (
                    <p className="text-xs text-gray-500 truncate">{album.description}</p>
                  )}
                  <div className="text-xs text-gray-500 mt-1 flex justify-between">
                    <span>{album.totalItems || 0} items</span>
                    {album.isDefault && <span className="text-blue-500">Default</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Selected Album Media */}
          {selectedAlbumId && (
            <div>
              <h4 className="font-medium mb-2">
                {albums.find(a => a._id === selectedAlbumId)?.name || 'Album'} Contents
              </h4>
              
              {isLoadingMedia ? (
                <div className="p-4 text-center text-gray-500">
                  Loading media...
                </div>
              ) : mediaItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems.map((media) => (
                    <div key={media._id} className="relative group">
                      {media.type === 'photo' ? (
                        <div className="aspect-square overflow-hidden rounded border border-gray-200">
                          <img
                            src={getImageUrl(media.content)}
                            alt={media.caption || 'Photo'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = getFallbackImageUrl();
                            }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-square overflow-hidden rounded border border-gray-200 bg-gray-50 p-2 flex items-center justify-center">
                          <div className="text-xs line-clamp-6 text-gray-700">
                            {media.content}
                          </div>
                        </div>
                      )}
                      {media.caption && (
                        <div className="text-xs truncate mt-1">{media.caption}</div>
                      )}
                      
                      {/* Overlay with delete button */}
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMedia(media._id);
                          }}
                          className="bg-red-600 text-white rounded-full p-1"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded">
                  No media in this album yet.
                  <button
                    className="block mx-auto mt-2 text-blue-500 hover:text-blue-700"
                    onClick={() => setIsUploadingMedia(true)}
                  >
                    Add Media
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Empty state when no albums */}
      {!isCreatingAlbum && !isUploadingMedia && albums.length === 0 && !isLoadingAlbums && (
        <div className="text-center py-6 bg-gray-50 rounded-lg mb-4">
          <h3 className="font-medium text-lg mb-2">No Albums Yet</h3>
          <p className="text-gray-500 mb-4">
            Create an album to organize your photos and notes
          </p>
          <div className="flex justify-center space-x-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setIsCreatingAlbum(true)}
            >
              Create Custom Album
            </button>
            <button
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              onClick={handleCreateDefaultAlbum}
            >
              Create Default Album
            </button>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isLoadingAlbums && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Album Creation Form */}
      {isCreatingAlbum && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Create New Album</h3>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsCreatingAlbum(false)}
              disabled={isSubmitting}
              type="button"
            >
              Cancel
            </button>
          </div>
          
          <form onSubmit={handleCreateAlbum}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Album Name*
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="e.g., Beach Day, Dinner Photos"
                required
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newAlbumDescription}
                onChange={(e) => setNewAlbumDescription(e.target.value)}
                placeholder="Optional description for this album"
                rows="2"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Album'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Media Upload Form */}
      {isUploadingMedia && selectedAlbumId && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">
              Add Media to "{albums.find(a => a._id === selectedAlbumId)?.name || 'Album'}"
            </h3>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsUploadingMedia(false)}
              disabled={isSubmitting}
              type="button"
            >
              Cancel
            </button>
          </div>
          
          <form onSubmit={handleMediaUpload}>
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
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Media'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

AlbumManager.propTypes = {
  tripId: PropTypes.string.isRequired,
  itemType: PropTypes.oneOf(['segment', 'stay']).isRequired,
  itemId: PropTypes.string.isRequired,
  onAlbumCreated: PropTypes.func,
  onAlbumSelected: PropTypes.func,
  onRefreshNeeded: PropTypes.func,
  defaultOpen: PropTypes.bool
};

export default AlbumManager;
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';
import AlbumAPI from '../../services/albumApi';
import MediaAPI from '../../services/mediaApi';
import MediaUpload from './MediaUpload';

/**
 * AlbumManager component for creating and managing media albums
 * Updated to receive albums as a prop instead of loading them
 */
const AlbumManager = ({ 
  tripId, 
  itemType, 
  itemId,
  albums = [],
  onAlbumCreated,
  onAlbumSelected,
  onRefreshNeeded,
  defaultOpen = false
}) => {
  // State for component sections
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(defaultOpen);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // Album state
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  
  // Media state
  const [mediaItems, setMediaItems] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  
  // Form state
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set initial selected album
  useEffect(() => {
    if (albums.length > 0 && !selectedAlbumId) {
      setSelectedAlbumId(albums[0]._id);
    }
  }, [albums, selectedAlbumId]);
  
  // Load media for the selected album
  useEffect(() => {
    const loadAlbumMedia = async () => {
      if (!selectedAlbumId) {
        setMediaItems([]);
        return;
      }
      
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
    };
    
    loadAlbumMedia();
  }, [selectedAlbumId]);
  
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
      const albumData = {
        name: newAlbumName,
        description: newAlbumDescription,
        tripId,
        relatedItem: {
          type: itemType,
          itemId
        },
        isDefault: albums.length === 0
      };
      
      console.log('Creating album with data:', albumData);
      
      const createdAlbum = await AlbumAPI.createAlbum(albumData);
      console.log('Album created successfully:', createdAlbum);
      
      setSelectedAlbumId(createdAlbum._id);
      
      if (onAlbumCreated) {
        onAlbumCreated(createdAlbum);
      }
      
      setNewAlbumName('');
      setNewAlbumDescription('');
      setMessage('Album created successfully!');
      
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
      
      setSelectedAlbumId(createdAlbum._id);
      setMessage('Default album created!');
      
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
  
  // Handle media added from MediaUpload component
  const handleMediaAdded = (media, albumId) => {
    if (albumId === selectedAlbumId) {
      setMediaItems(prev => [...prev, media]);
    }
    
    if (onRefreshNeeded) {
      onRefreshNeeded();
    }
    
    setIsUploadingMedia(false);
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
                    <div key={media._id} className="relative">
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
      {!isCreatingAlbum && !isUploadingMedia && albums.length === 0 && (
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
      
      {/* Media Upload Component */}
      {isUploadingMedia && (
        <MediaUpload
          tripId={tripId}
          itemType={itemType}
          itemId={itemId}
          initialAlbumId={selectedAlbumId}
          onMediaAdded={handleMediaAdded}
          onCancel={() => setIsUploadingMedia(false)}
        />
      )}
    </div>
  );
};

AlbumManager.propTypes = {
  tripId: PropTypes.string.isRequired,
  itemType: PropTypes.oneOf(['segment', 'stay']).isRequired,
  itemId: PropTypes.string.isRequired,
  albums: PropTypes.array,
  onAlbumCreated: PropTypes.func,
  onAlbumSelected: PropTypes.func,
  onRefreshNeeded: PropTypes.func,
  defaultOpen: PropTypes.bool
};

export default AlbumManager;
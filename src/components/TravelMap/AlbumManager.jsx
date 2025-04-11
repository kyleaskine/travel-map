import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';

/**
 * AlbumManager component for creating and managing media albums
 * Fixed to prevent duplicate album creation
 */
const AlbumManager = ({ 
  tripId, 
  itemType, 
  itemId, 
  media = [], 
  onAlbumCreated,
  onAlbumSelected,
  albums = []
}) => {
  // State for album creation
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  // Reset the form when opening/closing
  useEffect(() => {
    if (!isCreatingAlbum) {
      setNewAlbumName('');
      setNewAlbumDescription('');
      setSelectedMedia([]);
      setMessage('');
    }
  }, [isCreatingAlbum]);
  
  // Handle form submission WITHOUT making direct API call
  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    
    if (!newAlbumName.trim()) {
      setMessage('Please enter an album name');
      return;
    }
    
    if (selectedMedia.length === 0) {
      setMessage('Please select at least one media item');
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
        itemType,
        itemId,
        media: selectedMedia
      };
      
      console.log('Preparing album data:', albumData);
      
      // Instead of making API call here, we let the parent component handle it
      // by passing the data via callback
      if (onAlbumCreated) {
        const createdAlbum = await onAlbumCreated(albumData);
        
        // If parent component returns the created album, we can use it
        if (createdAlbum) {
          console.log('Album created successfully:', createdAlbum);
          setMessage('Album created successfully!');
        } else {
          // Otherwise just show a generic success message
          setMessage('Album created successfully!');
        }
      } else {
        console.warn('No onAlbumCreated callback provided');
        setMessage('Album created, but may not appear until refresh');
      }
      
      // Reset form
      setNewAlbumName('');
      setNewAlbumDescription('');
      setSelectedMedia([]);
      setIsSubmitting(false);
      
      // Close the creation form after a delay
      setTimeout(() => {
        setIsCreatingAlbum(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error creating album:', error);
      setMessage(`Error: ${error.message || 'Failed to create album'}`);
      setIsSubmitting(false);
    }
  };
  
  // Toggle media selection
  const toggleMediaSelection = (mediaItem) => {
    if (selectedMedia.some(item => item.content === mediaItem.content)) {
      setSelectedMedia(prev => prev.filter(item => item.content !== mediaItem.content));
    } else {
      setSelectedMedia(prev => [...prev, mediaItem]);
    }
  };
  
  // Get a cover image for album display
  const getAlbumCoverImage = (album) => {
    if (!album || !album.media || album.media.length === 0) {
      return getFallbackImageUrl();
    }
    
    // Find the first photo in the album
    const firstPhoto = album.media.find(item => item.type === 'photo');
    if (firstPhoto) {
      return getImageUrl(firstPhoto.content);
    }
    
    return getFallbackImageUrl();
  };
  
  return (
    <div className="album-manager">
      {/* Existing Albums List */}
      {!isCreatingAlbum && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-lg">Albums</h3>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
              onClick={() => setIsCreatingAlbum(true)}
            >
              Create Album
            </button>
          </div>
          
          {albums.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {albums.map((album) => (
                <div 
                  key={album._id} 
                  className="border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onAlbumSelected && onAlbumSelected(album)}
                >
                  <div className="aspect-video overflow-hidden rounded-t-lg bg-gray-100">
                    <img
                      src={getAlbumCoverImage(album)}
                      alt={album.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = getFallbackImageUrl();
                      }}
                    />
                  </div>
                  <div className="p-2">
                    <h4 className="font-medium text-sm">{album.name}</h4>
                    {album.description && (
                      <p className="text-xs text-gray-500 truncate">{album.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {album.media?.length || 0} items
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No albums yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create your first album to organize your media
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Album Creation Form */}
      {isCreatingAlbum && (
        <div className="bg-gray-50 p-4 rounded-lg">
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
          
          {message && (
            <div className={`mb-3 p-2 rounded text-sm ${
              message.startsWith('Error') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}
          
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
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Media*
              </label>
              
              {media.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {media.map((item, index) => (
                    <div 
                      key={index}
                      className={`border rounded cursor-pointer ${
                        selectedMedia.some(selected => selected.content === item.content)
                          ? 'ring-2 ring-blue-500 border-blue-300'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                      onClick={() => toggleMediaSelection(item)}
                    >
                      {item.type === 'photo' ? (
                        <div className="aspect-square overflow-hidden">
                          <img
                            src={getImageUrl(item.content)}
                            alt={item.caption || "Photo"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = getFallbackImageUrl();
                            }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 p-2 flex items-center justify-center">
                          <div className="text-xs text-gray-500 overflow-hidden line-clamp-4">
                            {item.content}
                          </div>
                        </div>
                      )}
                      
                      {item.caption && (
                        <div className="p-1 text-xs truncate">{item.caption}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                  No media available to add to albums
                </div>
              )}
              
              {selectedMedia.length > 0 && (
                <div className="mt-2 text-sm text-blue-600">
                  {selectedMedia.length} item(s) selected
                </div>
              )}
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
    </div>
  );
};

AlbumManager.propTypes = {
  tripId: PropTypes.string.isRequired,
  itemType: PropTypes.oneOf(['segment', 'stay']).isRequired,
  itemId: PropTypes.string.isRequired,
  media: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      caption: PropTypes.string,
      dateCreated: PropTypes.string
    })
  ),
  onAlbumCreated: PropTypes.func,
  onAlbumSelected: PropTypes.func,
  albums: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      media: PropTypes.array
    })
  )
};

export default AlbumManager;
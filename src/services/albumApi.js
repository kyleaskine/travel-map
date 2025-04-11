/**
 * API service for album operations
 */
const AlbumAPI = {
    // Base URL for API endpoints
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    
    /**
     * Get all albums for a trip
     * @param {string} tripId - The ID of the trip
     * @returns {Promise<Array>} Array of album objects
     */
    async getAlbumsByTrip(tripId) {
      try {
        const response = await fetch(`${this.baseURL}/api/albums/trip/${tripId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to fetch albums for trip ${tripId}:`, error);
        throw error;
      }
    },
    
    /**
     * Get albums for a specific item (segment or stay)
     * @param {string} tripId - The ID of the trip
     * @param {string} itemType - 'segment' or 'stay'
     * @param {string} itemId - The ID of the item
     * @returns {Promise<Array>} Array of album objects
     */
    async getAlbumsByItem(tripId, itemType, itemId) {
      try {
        const response = await fetch(`${this.baseURL}/api/albums/trip/${tripId}/${itemType}/${itemId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to fetch albums for ${itemType} ${itemId}:`, error);
        throw error;
      }
    },
    
    /**
     * Get a specific album by ID
     * @param {string} albumId - The ID of the album
     * @returns {Promise<Object>} Album object
     */
    async getAlbumById(albumId) {
      try {
        const response = await fetch(`${this.baseURL}/api/albums/${albumId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to fetch album ${albumId}:`, error);
        throw error;
      }
    },
    
    /**
     * Create a new album
     * @param {Object} albumData - Album data object
     * @returns {Promise<Object>} Created album object
     */
    async createAlbum(albumData) {
      try {
        const response = await fetch(`${this.baseURL}/api/albums`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(albumData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Failed to create album:', error);
        throw error;
      }
    },
    
    /**
     * Update an existing album
     * @param {string} albumId - The ID of the album to update
     * @param {Object} albumData - Updated album data
     * @returns {Promise<Object>} Updated album object
     */
    async updateAlbum(albumId, albumData) {
      try {
        const response = await fetch(`${this.baseURL}/api/albums/${albumId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(albumData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to update album ${albumId}:`, error);
        throw error;
      }
    },
    
    /**
     * Delete an album
     * @param {string} albumId - The ID of the album to delete
     * @returns {Promise<Object>} Response object
     */
    async deleteAlbum(albumId) {
      try {
        const response = await fetch(`${this.baseURL}/api/albums/${albumId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to delete album ${albumId}:`, error);
        throw error;
      }
    },
    
    /**
     * Add media to an album
     * @param {string} albumId - The ID of the album
     * @param {Object} mediaData - Media data object
     * @returns {Promise<Object>} Updated album object
     */
    async addMediaToAlbum(albumId, mediaData) {
      try {
        const response = await fetch(`${this.baseURL}/api/albums/${albumId}/media`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mediaData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to add media to album ${albumId}:`, error);
        throw error;
      }
    },
    
    /**
     * Remove media from an album
     * @param {string} albumId - The ID of the album
     * @param {string} mediaId - The ID of the media
     * @returns {Promise<Object>} Updated album object
     */
    async removeMediaFromAlbum(albumId, mediaId) {
      try {
        const response = await fetch(`${this.baseURL}/api/albums/${albumId}/media/${mediaId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to remove media ${mediaId} from album ${albumId}:`, error);
        throw error;
      }
    }
  };
  
  export default AlbumAPI;
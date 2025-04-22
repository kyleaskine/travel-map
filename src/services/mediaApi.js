/**
 * API service for media operations - Updated for album-centric architecture
 */
const MediaAPI = {
  // Base URL for API endpoints
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  
  /**
   * Upload a photo file
   * @param {File} photoFile - The file object to upload
   * @returns {Promise<Object>} Object containing URL of the uploaded file
   */
  async uploadPhoto(photoFile) {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const response = await fetch(`${this.baseURL}/api/media/upload`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header here - browser will add it with boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      throw error;
    }
  },
  
  /**
   * Get all media items for an album
   * @param {string} albumId - The ID of the album
   * @returns {Promise<Array>} Array of media items
   */
  async getMediaByAlbum(albumId) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/album/${albumId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch media for album ${albumId}:`, error);
      throw error;
    }
  },
  
  /**
   * Add media to an album
   * @param {string} albumId - The ID of the album
   * @param {Object} mediaData - Media data object (type, content, caption)
   * @returns {Promise<Object>} Added media object
   */
  async addMediaToAlbum(albumId, mediaData) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/album/${albumId}`, {
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
   * Get a single media item
   * @param {string} mediaId - The ID of the media item
   * @returns {Promise<Object>} Media item object
   */
  async getMediaItem(mediaId) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/${mediaId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch media item ${mediaId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update a media item
   * @param {string} mediaId - The ID of the media item
   * @param {Object} mediaData - Updated media data
   * @returns {Promise<Object>} Updated media object
   */
  async updateMediaItem(mediaId, mediaData) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/${mediaId}`, {
        method: 'PUT',
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
      console.error(`Failed to update media item ${mediaId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a media item
   * @param {string} mediaId - The ID of the media item to delete
   * @returns {Promise<Object>} Response object
   */
  async deleteMediaItem(mediaId) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/${mediaId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to delete media item ${mediaId}:`, error);
      throw error;
    }
  },
  
  /**
   * Move a media item to another album
   * @param {string} mediaId - The ID of the media item
   * @param {string} targetAlbumId - The ID of the target album
   * @returns {Promise<Object>} Response object
   */
  async moveMediaItem(mediaId, targetAlbumId) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/${mediaId}/move/${targetAlbumId}`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to move media item ${mediaId}:`, error);
      throw error;
    }
  }
};

export default MediaAPI;
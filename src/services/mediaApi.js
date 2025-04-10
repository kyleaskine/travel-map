/**
 * API service for media operations (photos, notes, etc.)
 */
const MediaAPI = {
    // Base URL for API endpoints - should match your tripApi.js
    baseURL: 'http://localhost:5000/api',
    
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
        
        const response = await fetch(`${this.baseURL}/media/upload`, {
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
     * Add media to a segment
     * @param {string} tripId - The ID of the trip
     * @param {string} segmentId - The ID of the segment
     * @param {Object} mediaData - Media data object (type, content, caption)
     * @returns {Promise<Object>} Added media object
     */
    async addMediaToSegment(tripId, segmentId, mediaData) {
      try {
        const response = await fetch(`${this.baseURL}/media/segment/${tripId}/${segmentId}`, {
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
        console.error(`Failed to add media to segment ${segmentId}:`, error);
        throw error;
      }
    },
    
    /**
     * Add media to a stay
     * @param {string} tripId - The ID of the trip
     * @param {string} stayId - The ID of the stay
     * @param {Object} mediaData - Media data object (type, content, caption)
     * @returns {Promise<Object>} Added media object
     */
    async addMediaToStay(tripId, stayId, mediaData) {
      try {
        const response = await fetch(`${this.baseURL}/media/stay/${tripId}/${stayId}`, {
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
        console.error(`Failed to add media to stay ${stayId}:`, error);
        throw error;
      }
    },
    
    /**
     * Delete media from a segment
     * @param {string} tripId - The ID of the trip
     * @param {string} segmentId - The ID of the segment
     * @param {string} mediaId - The ID of the media
     * @returns {Promise<Object>} Response object
     */
    async deleteMediaFromSegment(tripId, segmentId, mediaId) {
      try {
        const response = await fetch(`${this.baseURL}/media/segment/${tripId}/${segmentId}/${mediaId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to delete media ${mediaId} from segment ${segmentId}:`, error);
        throw error;
      }
    },
    
    /**
     * Delete media from a stay
     * @param {string} tripId - The ID of the trip
     * @param {string} stayId - The ID of the stay
     * @param {string} mediaId - The ID of the media
     * @returns {Promise<Object>} Response object
     */
    async deleteMediaFromStay(tripId, stayId, mediaId) {
      try {
        const response = await fetch(`${this.baseURL}/media/stay/${tripId}/${stayId}/${mediaId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to delete media ${mediaId} from stay ${stayId}:`, error);
        throw error;
      }
    }
  };
  
  export default MediaAPI;
/**
 * API service for communicating with the travel backend
 */
const TripAPI = {
    // Base URL for API endpoints - change this based on your environment
    baseURL: 'http://localhost:5000/api',
    
    /**
     * Get all trips
     * @returns {Promise<Array>} Array of trip objects
     */
    async getAllTrips() {
      try {
        const response = await fetch(`${this.baseURL}/trips`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch trips:', error);
        throw error;
      }
    },
    
    /**
     * Get a trip by ID
     * @param {string} tripId - The ID of the trip to fetch
     * @returns {Promise<Object>} Trip object
     */
    async getTripById(tripId) {
      try {
        const response = await fetch(`${this.baseURL}/trips/${tripId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to fetch trip ${tripId}:`, error);
        throw error;
      }
    },
    
    /**
     * Create a new trip
     * @param {Object} tripData - Trip data object
     * @returns {Promise<Object>} Created trip object
     */
    async createTrip(tripData) {
      try {
        const response = await fetch(`${this.baseURL}/trips`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tripData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Failed to create trip:', error);
        throw error;
      }
    },
    
    /**
     * Update an existing trip
     * @param {string} tripId - The ID of the trip to update
     * @param {Object} tripData - Updated trip data
     * @returns {Promise<Object>} Updated trip object
     */
    async updateTrip(tripId, tripData) {
      try {
        const response = await fetch(`${this.baseURL}/trips/${tripId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tripData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to update trip ${tripId}:`, error);
        throw error;
      }
    },
    
    /**
     * Delete a trip
     * @param {string} tripId - The ID of the trip to delete
     * @returns {Promise<Object>} Response object
     */
    async deleteTrip(tripId) {
      try {
        const response = await fetch(`${this.baseURL}/trips/${tripId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Failed to delete trip ${tripId}:`, error);
        throw error;
      }
    }
  };
  
  export default TripAPI;
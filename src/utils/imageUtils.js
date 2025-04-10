/**
 * Utility functions for handling image URLs
 */

/**
 * Get a properly formatted image URL that works across environments
 * @param {string} path - The image path from the API
 * @returns {string} Properly formatted image URL
 */
export const getImageUrl = (path) => {
    if (!path) return '';
    
    // If it's already a data URL or absolute URL, return as is
    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Get API URL from environment variable - hardcode a fallback to make sure we use port 5000
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    // Handle different path formats - ensure we have a consistent path structure
    let cleanPath = path;
    
    // If path already includes 'uploads/', extract just the filename part
    if (cleanPath.startsWith('/uploads/')) {
      cleanPath = cleanPath.substring(9); // Remove leading '/uploads/'
    } else if (cleanPath.startsWith('uploads/')) {
      cleanPath = cleanPath.substring(8); // Remove leading 'uploads/'
    }
    
    // Check if it's just a filename (which would happen with some upload strategies)
    if (!cleanPath.includes('/')) {
      // If it's just a filename, assume it goes in the uploads directory
      return `${apiUrl}/uploads/${cleanPath}`;
    }
    
    // If it's a more complex path but doesn't start with a slash, add one
    if (!path.startsWith('/')) {
      return `${apiUrl}/${path}`;
    }
    
    // Otherwise, just join the API URL and the path
    return `${apiUrl}${path}`;
  };
  
  /**
   * Log debug info about an image URL
   * @param {string} originalPath - The original path
   * @param {string} finalUrl - The processed URL
   */
  export const logImageDebug = (originalPath, finalUrl) => {
    console.log('Image URL Debug:', {
      original: originalPath,
      processed: finalUrl,
      apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000'
    });
  };
  
  /**
   * Get a fallback image for when images fail to load
   * @returns {string} Data URL for a placeholder image
   */
  export const getFallbackImageUrl = () => {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
  };
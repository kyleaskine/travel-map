import { useState, useCallback, useEffect } from 'react';
import AlbumAPI from '../services/albumApi';

/**
 * Custom hook for loading and managing albums
 * Eliminates duplicate album loading logic across components
 */
const useAlbums = (tripId, itemType, itemId, autoLoad = true) => {
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAlbums = useCallback(async () => {
    if (!tripId || !itemType || !itemId) {
      console.log('Missing required params for loading albums');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const albumData = await AlbumAPI.getAlbumsByItem(tripId, itemType, itemId);
      console.log(`Loaded ${albumData.length} albums for ${itemType} ${itemId}`);
      setAlbums(albumData);
      return albumData;
    } catch (err) {
      console.error('Failed to load albums:', err);
      setError(err.message || 'Failed to load albums');
      setAlbums([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [tripId, itemType, itemId]);

  // Auto-load albums when dependencies change
  useEffect(() => {
    if (autoLoad && tripId && itemType && itemId) {
      loadAlbums();
    }
  }, [autoLoad, tripId, itemType, itemId, loadAlbums]);

  // Load all albums for a trip
  const loadTripAlbums = useCallback(async () => {
    if (!tripId) return {};

    setIsLoading(true);
    setError(null);

    try {
      const allAlbums = await AlbumAPI.getAlbumsByTrip(tripId);
      
      // Group albums by item
      const albumsByItem = {};
      
      allAlbums.forEach(album => {
        if (album.relatedItem && album.relatedItem.itemId) {
          const key = `${album.relatedItem.type}-${album.relatedItem.itemId}`;
          if (!albumsByItem[key]) {
            albumsByItem[key] = [];
          }
          albumsByItem[key].push(album);
        }
      });

      return albumsByItem;
    } catch (err) {
      console.error('Failed to load trip albums:', err);
      setError(err.message || 'Failed to load trip albums');
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  return {
    albums,
    isLoading,
    error,
    loadAlbums,
    loadTripAlbums,
    setAlbums
  };
};

export default useAlbums;
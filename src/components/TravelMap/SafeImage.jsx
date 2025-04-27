import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getFallbackImageUrl } from '../../utils/imageUtils';

/**
 * SafeImage component that handles loading errors and component unmounting gracefully
 */
const SafeImage = ({ src, alt, className, style, onLoad, onError }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isMounted = useRef(true);
  const imgRef = useRef(null);

  // Handle component unmounting
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Handle image loading
  useEffect(() => {
    // Reset state when src changes
    setIsLoading(true);
    setHasError(false);
    
    // Don't set src in state immediately - load the image first
    const img = new Image();
    img.onload = () => {
      if (isMounted.current) {
        setImgSrc(src);
        setIsLoading(false);
        if (onLoad) onLoad();
      }
    };
    
    img.onerror = () => {
      if (isMounted.current) {
        console.error(`Failed to load image: ${src}`);
        setHasError(true);
        setIsLoading(false);
        if (onError) onError();
      }
    };
    
    // Start loading the image
    img.src = src;
    
    // Clean up
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className={className}
        style={{
          ...style,
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="animate-pulse h-full w-full" />
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <img
        ref={imgRef}
        src={getFallbackImageUrl()}
        alt={alt || 'Image failed to load'}
        className={className}
        style={style}
      />
    );
  }

  // Show loaded image
  return (
    <img
      ref={imgRef}
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
    />
  );
};

SafeImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  onLoad: PropTypes.func,
  onError: PropTypes.func
};

export default SafeImage;
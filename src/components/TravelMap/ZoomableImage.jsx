import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getFallbackImageUrl } from '../../utils/imageUtils';

/**
 * ZoomableImage component that provides a magnifying glass effect
 * when users click on an image and move their cursor
 */
const ZoomableImage = ({ src, alt, className, style, zoomLevel = 2.5 }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  
  // Handle image loading
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
      setDimensions({
        width: img.width,
        height: img.height
      });
    };
    
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  
  // Handle toggling zoom mode on click
  const toggleZoom = (e) => {
    if (isLoading || hasError) return;
    
    setIsZoomActive(!isZoomActive);
    if (!isZoomActive) {
      updateZoomPosition(e);
    }
  };
  
  // Update zoom position as mouse moves
  const updateZoomPosition = (e) => {
    if (!isZoomActive || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate position relative to the image container
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Constrain values between 0 and 1
    const constrainedX = Math.max(0, Math.min(1, x));
    const constrainedY = Math.max(0, Math.min(1, y));
    
    setZoomPosition({ x: constrainedX, y: constrainedY });
  };
  
  // Calculate zoom window position
  const calculateBackgroundPosition = () => {
    // This creates the effect of the background-position moving inversely to center
    // the zoomed portion under the cursor
    const x = zoomPosition.x * 100;
    const y = zoomPosition.y * 100;
    return `${x}% ${y}%`;
  };
  
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
        src={getFallbackImageUrl()}
        alt={alt || 'Image failed to load'}
        className={className}
        style={style}
      />
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className={`relative cursor-zoom-in ${isZoomActive ? 'cursor-zoom-out' : 'cursor-zoom-in'} ${className || ''}`}
      style={{
        ...style,
        aspectRatio: `${dimensions.width} / ${dimensions.height}`,
        overflow: 'hidden'
      }}
      onClick={toggleZoom}
      onMouseMove={updateZoomPosition}
      onMouseLeave={() => setIsZoomActive(false)}
    >
      {/* Base image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        style={{ 
          transition: 'opacity 0.2s',
          opacity: isZoomActive ? 0.3 : 1
        }}
      />
      
      {/* Zoom overlay - only shown when active */}
      {isZoomActive && (
        <div
          className="absolute inset-0 bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: `${zoomLevel * 100}%`,
            backgroundPosition: calculateBackgroundPosition(),
            width: '100%',
            height: '100%'
          }}
        />
      )}
      
      {/* Optional zoom instruction indicator - shown when not active */}
      {!isZoomActive && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded opacity-70">
          Click to zoom
        </div>
      )}
    </div>
  );
};

ZoomableImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  zoomLevel: PropTypes.number
};

export default ZoomableImage;
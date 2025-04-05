import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Simplified MediaUpload component for testing
 * Stores images in public/images/[segment or stay]/[id]
 */
const MediaUpload = ({ itemType, itemId, onMediaAdded }) => {
  const [mediaType, setMediaType] = useState('photo');
  const [caption, setCaption] = useState('');
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setError('');
    setSuccess('');
    
    try {
      // For a real app, you'd upload to a server
      // This simplified version just creates URLs to existing files 
      // or store notes directly
      
      let newMedia = {
        type: mediaType,
        caption: caption,
        dateCreated: new Date().toISOString()
      };
      
      if (mediaType === 'photo') {
        if (!photoFile) {
          throw new Error('Please select a photo');
        }
        
        // In a real application, you'd upload the file to a server
        // For this simplified version, we'll save to a predictable path
        // assuming the files would be manually copied there
        
        // Create path: public/images/[segment or stay]/[id]/[filename]
        const fileName = photoFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const relativePath = `/images/${itemType}s/${itemId}/${fileName}`;
        
        // In a real app, you'd do something like:
        /*
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('path', `${itemType}s/${itemId}`);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload file');
        }
        
        const data = await response.json();
        newMedia.content = data.url;
        */
        
        // For this simplified version:
        newMedia.content = relativePath;
        
        // Log instructions for manually copying files
        console.log(`UPLOAD: To complete this simulated upload, manually copy the selected file to: public${relativePath}`);
      } else {
        // For notes, just store the content directly
        if (!content.trim()) {
          throw new Error('Please enter some note content');
        }
        newMedia.content = content;
      }
      
      // In a real app, you'd update the database
      // For now, just pass the new media to the parent component
      if (onMediaAdded) {
        onMediaAdded(newMedia);
      }
      
      // Display success message
      setSuccess(`${mediaType === 'photo' ? 'Photo' : 'Note'} added successfully!`);
      
      // Clear form for next input
      setMediaType('photo');
      setCaption('');
      setContent('');
      setPhotoFile(null);
      setPhotoPreview('');
      
    } catch (err) {
      console.error('Error adding media:', err);
      setError(err.message || 'Failed to add media');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle photo file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      
      // Preview the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50 mt-4">
      <h3 className="text-lg font-medium mb-3">Add Media</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Media Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Media Type
          </label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="mediaType"
                value="photo"
                checked={mediaType === 'photo'}
                onChange={() => setMediaType('photo')}
              />
              <span className="ml-2">Photo</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="mediaType"
                value="note"
                checked={mediaType === 'note'}
                onChange={() => setMediaType('note')}
              />
              <span className="ml-2">Note</span>
            </label>
          </div>
        </div>
        
        {/* Caption */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Caption
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Enter a caption (optional)"
          />
        </div>
        
        {/* Content - conditionally show based on media type */}
        {mediaType === 'photo' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Photo
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              onChange={handleFileChange}
            />
            {photoPreview && (
              <div className="mt-2">
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="h-40 object-contain"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note Content
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="4"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
            ></textarea>
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUploading}
        >
          {isUploading ? 'Adding...' : 'Add Media'}
        </button>
      </form>
      
      {/* Note for testing */}
      {mediaType === 'photo' && (
        <div className="mt-4 text-xs text-gray-500 italic">
          <p>Note: For testing, you'll need to manually copy your photos to:</p>
          <p className="font-mono mt-1">public/images/{itemType}s/{itemId}/</p>
        </div>
      )}
    </div>
  );
};

MediaUpload.propTypes = {
  itemType: PropTypes.oneOf(['segment', 'stay']).isRequired,
  itemId: PropTypes.string.isRequired,
  onMediaAdded: PropTypes.func.isRequired
};

export default MediaUpload;
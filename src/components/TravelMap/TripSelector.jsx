import React from 'react';

/**
 * TripSelector component for selecting between available trips
 */
const TripSelector = ({ trips, selectedTripId, onTripChange }) => {
  if (!trips || trips.length <= 1) {
    return null;
  }

  return (
    <div className="trip-selector">
      <select
        value={selectedTripId}
        onChange={(e) => onTripChange(e.target.value)}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          border: '1px solid white',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          fontWeight: '500',
          cursor: 'pointer',
          outline: 'none',
          minWidth: '150px'
        }}
      >
        {trips.map((trip) => (
          <option key={trip._id} value={trip._id}>
            {trip.tripName}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TripSelector;
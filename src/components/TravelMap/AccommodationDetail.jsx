import React from "react";
import PropTypes from "prop-types";
import { segmentDetailStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";

/**
 * AccommodationDetail component displays details about the selected accommodation
 */
const AccommodationDetail = ({ accommodation, onClose }) => {
  if (!accommodation) return null;

  return (
    <div style={{
      ...segmentDetailStyles.container,
      borderLeft: "4px solid #8800ff"
    }}>
      <div style={segmentDetailStyles.header}>
        <h3 style={segmentDetailStyles.title}>
          {accommodation.location}
        </h3>
        <button
          style={segmentDetailStyles.closeButton}
          onClick={onClose}
          aria-label="Close details"
        >
          ✕
        </button>
      </div>
      
      <div style={segmentDetailStyles.date}>
        {formatDate(accommodation.dateStart)} - {formatDate(accommodation.dateEnd)}
      </div>
      
      <div style={segmentDetailStyles.typeIndicator}>
        <div style={{
          width: "1rem",
          height: "1rem",
          backgroundColor: "#8800ff",
          borderRadius: "9999px",
          marginRight: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{
            color: "white",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}>
            H
          </span>
        </div>
        <div style={segmentDetailStyles.typeText}>
          Accommodation
        </div>
      </div>
      
      <div style={segmentDetailStyles.details}>
        {accommodation.notes && (
          <div style={segmentDetailStyles.detailItem}>
            <strong>Notes:</strong> {accommodation.notes}
          </div>
        )}
        <div style={segmentDetailStyles.detailItem}>
          <strong>Coordinates:</strong> {accommodation.coordinates[0].toFixed(4)}, {accommodation.coordinates[1].toFixed(4)}
        </div>
      </div>
    </div>
  );
};

AccommodationDetail.propTypes = {
  accommodation: PropTypes.shape({
    location: PropTypes.string.isRequired,
    dateStart: PropTypes.string.isRequired,
    dateEnd: PropTypes.string.isRequired,
    notes: PropTypes.string,
    coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
  }),
  onClose: PropTypes.func.isRequired
};

export default AccommodationDetail;
import React from "react";
import PropTypes from "prop-types";
import { segmentDetailStyles } from "../../utils/styleUtils";
import { formatDate } from "../../utils/dateUtils";

/**
 * SegmentDetail component displays details about the selected segment
 */
const SegmentDetail = ({ segment, onClose }) => {
  if (!segment) return null;

  return (
    <div style={segmentDetailStyles.container}>
      <div style={segmentDetailStyles.header}>
        <h3 style={segmentDetailStyles.title}>
          {segment.transport}
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
        {formatDate(segment.date)}
      </div>
      
      <div style={segmentDetailStyles.typeIndicator}>
        <div style={segmentDetailStyles.typeDot(segment.type)}></div>
        <div style={segmentDetailStyles.typeText}>
          {segment.type}
        </div>
      </div>
      
      <div style={segmentDetailStyles.details}>
        <div style={segmentDetailStyles.detailItem}>
          <strong>From:</strong> {segment.origin.name}
          {segment.origin.code && ` (${segment.origin.code})`}
        </div>
        <div style={segmentDetailStyles.detailItem}>
          <strong>To:</strong> {segment.destination.name}
          {segment.destination.code && ` (${segment.destination.code})`}
        </div>
      </div>
    </div>
  );
};

SegmentDetail.propTypes = {
  segment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    transport: PropTypes.string.isRequired,
    origin: PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string,
      coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
    }).isRequired,
    destination: PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string,
      coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
    }).isRequired
  }),
  onClose: PropTypes.func.isRequired
};

export default SegmentDetail;
import React from "react";
import PropTypes from "prop-types";
import { timelineStyles } from "../../utils/styleUtils";
import { truncateString } from "../../utils/dateUtils";

/**
 * TimelineSegment component displays a single segment in the timeline
 */
const TimelineSegment = ({ segment, isActive, isFocused, onClick, id }) => {
  const MAX_NAME_LENGTH = 15;

  return (
    <div
      id={id}
      style={{
        ...timelineStyles.segmentItem(isActive),
        borderLeft: isFocused ? "3px solid #2563eb" : "3px solid transparent",
        backgroundColor: isActive 
          ? "#ebf5ff" 
          : isFocused 
            ? "#f0f7ff" 
            : "transparent", 
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={timelineStyles.segmentDot(segment.type)}></div>
        <div style={timelineStyles.segmentTitle}>
          {segment.transport}
        </div>
      </div>
      <div style={timelineStyles.segmentSubtitle}>
        {truncateString(segment.origin.name, MAX_NAME_LENGTH)} →{" "}
        {truncateString(segment.destination.name, MAX_NAME_LENGTH)}
      </div>
    </div>
  );
};

TimelineSegment.propTypes = {
  segment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    transport: PropTypes.string.isRequired,
    origin: PropTypes.shape({
      name: PropTypes.string.isRequired
    }).isRequired,
    destination: PropTypes.shape({
      name: PropTypes.string.isRequired
    }).isRequired
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isFocused: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  id: PropTypes.string
};

export default TimelineSegment;
import React from "react";
import PropTypes from "prop-types";
import { formatDate } from "../../utils/dateUtils";

/**
 * TimelineAccommodation component displays a stay/accommodation in the timeline
 */
const TimelineAccommodation = ({ stay, isActive, isFocused, onClick, id }) => {
  return (
    <div
      id={id}
      style={{
        padding: "0.75rem",
        backgroundColor: isActive 
          ? "#f0e7ff" 
          : isFocused 
            ? "#f0f7ff" 
            : "transparent",
        borderBottom: "1px solid #f3f4f6",
        borderLeft: isFocused ? "3px solid #8800ff" : "3px solid transparent",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "1rem",
            height: "1rem",
            backgroundColor: "#8800ff",
            borderRadius: "9999px",
            marginRight: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            H
          </span>
        </div>
        <div
          style={{
            fontWeight: "500",
            fontSize: "0.875rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {stay.location}
        </div>
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          marginTop: "0.25rem",
          marginLeft: "1.25rem",
          color: "#4b5563",
        }}
      >
        {formatDate(stay.dateStart)} - {formatDate(stay.dateEnd)}
      </div>
      {stay.notes && (
        <div
          style={{
            fontSize: "0.75rem",
            marginTop: "0.25rem",
            marginLeft: "1.25rem",
            color: "#4b5563",
            fontStyle: "italic",
          }}
        >
          {stay.notes}
        </div>
      )}
    </div>
  );
};

TimelineAccommodation.propTypes = {
  stay: PropTypes.shape({
    location: PropTypes.string.isRequired,
    dateStart: PropTypes.string.isRequired,
    dateEnd: PropTypes.string.isRequired,
    notes: PropTypes.string,
    coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
  }).isRequired,
  isActive: PropTypes.bool,
  isFocused: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  id: PropTypes.string
};

TimelineAccommodation.defaultProps = {
  isActive: false,
  isFocused: false
};

export default TimelineAccommodation;
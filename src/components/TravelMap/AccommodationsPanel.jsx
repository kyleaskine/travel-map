import React from "react";
import PropTypes from "prop-types";
import { formatDate } from "../../utils/dateUtils";

/**
 * AccommodationsPanel component displays accommodation information
 */
const AccommodationsPanel = ({ stays }) => {
  if (!stays || stays.length === 0) return null;

  return (
    <>
      <div
        style={{
          padding: "0.75rem",
          backgroundColor: "#f3f4f6",
          borderBottom: "1px solid #e5e7eb",
          marginTop: "1rem",
        }}
      >
        <h2 style={{ fontWeight: "bold" }}>Accommodations</h2>
      </div>
      <div>
        {stays.map((stay, index) => (
          <div
            key={index}
            style={{ padding: "0.75rem", borderBottom: "1px solid #f3f4eb" }}
          >
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              {formatDate(stay.dateStart)} - {formatDate(stay.dateEnd)}
            </div>
            <div style={{ fontWeight: "500", fontSize: "0.875rem" }}>
              {stay.location}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                marginTop: "0.25rem",
                color: "#4b5563",
              }}
            >
              {stay.notes}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

AccommodationsPanel.propTypes = {
  stays: PropTypes.arrayOf(
    PropTypes.shape({
      location: PropTypes.string.isRequired,
      coordinates: PropTypes.arrayOf(PropTypes.number).isRequired,
      dateStart: PropTypes.string.isRequired,
      dateEnd: PropTypes.string.isRequired,
      notes: PropTypes.string
    })
  ).isRequired
};

export default AccommodationsPanel;
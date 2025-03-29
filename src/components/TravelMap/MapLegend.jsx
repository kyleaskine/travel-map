import React from "react";
import { legendStyles } from "../../utils/styleUtils";
import { getRouteColor } from "../../utils/styleUtils";

/**
 * MapLegend component displays a legend of transportation types
 */
const MapLegend = () => {
  // Transportation types to display in the legend
  const transportTypes = {
    flight: "Flight",
    train: "Train",
    shuttle: "Shuttle",
    walk: "Walk",
    bus: "Bus",
  };

  return (
    <div style={legendStyles.container}>
      <div style={legendStyles.title}>Transportation Types</div>
      
      {/* Transportation type items */}
      {Object.entries(transportTypes).map(([type, label]) => (
        <div key={type} style={legendStyles.itemContainer}>
          <div style={legendStyles.legendDot(getRouteColor(type))}></div>
          <div style={legendStyles.itemText}>{label}</div>
        </div>
      ))}
      
      {/* Accommodation legend item */}
      <div style={{ ...legendStyles.itemContainer, marginTop: "0.5rem" }}>
        <div style={legendStyles.accommodationIcon}>
          <span style={legendStyles.accommodationText}>H</span>
        </div>
        <div style={legendStyles.itemText}>Accommodation</div>
      </div>
    </div>
  );
};

export default MapLegend;
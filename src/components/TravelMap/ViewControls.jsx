import React from "react";
import PropTypes from "prop-types";
import { viewControlStyles } from "../../utils/styleUtils";

/**
 * ViewControls component for switching between different map views
 */
const ViewControls = ({ viewMode, setViewMode, hasActiveItem }) => {
  return (
    <div style={viewControlStyles.container}>
      <button
        style={viewControlStyles.button(viewMode === "world")}
        onClick={() => setViewMode("world")}
      >
        World View
      </button>
      <button
        style={viewControlStyles.button(viewMode === "japan")}
        onClick={() => setViewMode("japan")}
      >
        Japan View
      </button>
      {hasActiveItem && (
        <button
          style={viewControlStyles.button(viewMode === "local")}
          onClick={() => setViewMode("local")}
        >
          Local View
        </button>
      )}
    </div>
  );
};

ViewControls.propTypes = {
  viewMode: PropTypes.oneOf(["world", "japan", "local"]).isRequired,
  setViewMode: PropTypes.func.isRequired,
  hasActiveItem: PropTypes.bool.isRequired
};

export default ViewControls;
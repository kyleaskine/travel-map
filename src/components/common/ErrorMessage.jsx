import React from "react";
import PropTypes from "prop-types";
import { errorStyles } from "../../utils/styleUtils";

/**
 * ErrorMessage component displays error messages with a reload option
 */
const ErrorMessage = ({ message, onReload }) => {
  return (
    <div style={errorStyles.container}>
      <p>{message}</p>
      <button
        style={errorStyles.reloadButton}
        onClick={onReload}
      >
        Reload Page
      </button>
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
  onReload: PropTypes.func.isRequired
};

export default ErrorMessage;
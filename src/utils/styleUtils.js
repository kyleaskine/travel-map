/**
 * Get the color for a transportation type
 * @param {string} type - Type of transportation ('flight', 'train', etc.)
 * @returns {string} HEX color code
 */
export const getRouteColor = (type) => {
    const colorMap = {
      flight: "#3388ff",
      train: "#ff3333",
      shuttle: "#33cc33",
      walk: "#ff9900",
      bus: "#9933cc",
    };
    return colorMap[type] || "#999999";
  };
  
  /**
   * Styling for the header component
   */
  export const headerStyles = {
    header: {
      backgroundColor: "#2563eb",
      color: "white",
      padding: "1rem",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: "bold",
    },
    subtitle: {
      fontSize: "0.875rem",
    },
  };
  
  /**
   * Styling for the timeline panel
   */
  export const timelineStyles = {
    container: {
      width: "16rem",
      backgroundColor: "white",
      boxShadow: "4px 0 6px -1px rgba(0, 0, 0, 0.1)",
      overflowY: "auto",
    },
    header: {
      padding: "0.75rem",
      backgroundColor: "#f3f4f6",
      borderBottom: "1px solid #e5e7eb",
    },
    dayHeader: {
      padding: "0.5rem 0.75rem",
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
      borderTop: "1px solid #e5e7eb",
    },
    dayText: {
      fontSize: "0.875rem",
      color: "#4b5563",
    },
    segmentItem: (isActive) => ({
      padding: "0.75rem",
      cursor: "pointer",
      backgroundColor: isActive ? "#ebf5ff" : "transparent",
      borderBottom: "1px solid #f3f4f6",
    }),
    segmentDot: (type) => ({
      width: "0.75rem",
      height: "0.75rem",
      borderRadius: "9999px",
      marginRight: "0.5rem",
      flexShrink: 0,
      backgroundColor: getRouteColor(type),
    }),
    segmentTitle: {
      fontWeight: "500",
      fontSize: "0.875rem",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    segmentSubtitle: {
      fontSize: "0.75rem",
      marginTop: "0.25rem",
      marginLeft: "1.25rem",
      color: "#4b5563",
    },
  };
  
  /**
   * Styling for the view control buttons
   */
  export const viewControlStyles = {
    container: {
      position: "absolute",
      top: "1rem",
      left: "5rem",
      zIndex: "10",
      display: "flex",
      gap: "0.5rem",
    },
    button: (isActive) => ({
      padding: "0.5rem 0.75rem",
      borderRadius: "0.375rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      backgroundColor: isActive ? "#2563eb" : "white",
      color: isActive ? "white" : "black",
      cursor: "pointer",
      border: "none",
    }),
  };
  
  /**
   * Styling for the legend
   */
  export const legendStyles = {
    container: {
      position: "absolute",
      top: "1rem",
      right: "1rem",
      backgroundColor: "white",
      padding: "0.75rem",
      borderRadius: "0.5rem",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      zIndex: "10",
    },
    title: {
      fontSize: "0.875rem",
      fontWeight: "bold",
      marginBottom: "0.5rem",
    },
    itemContainer: {
      display: "flex",
      alignItems: "center",
      marginBottom: "0.25rem",
    },
    legendDot: (color) => ({
      width: "0.75rem",
      height: "0.75rem",
      borderRadius: "9999px",
      marginRight: "0.5rem",
      backgroundColor: color,
    }),
    itemText: {
      fontSize: "0.75rem",
    },
    accommodationIcon: {
      width: "1rem",
      height: "1rem",
      backgroundColor: "#8800ff",
      borderRadius: "9999px",
      marginRight: "0.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    accommodationText: {
      color: "white",
      fontSize: "0.75rem",
      fontWeight: "bold",
    },
  };
  
  /**
   * Styling for segment details panel
   */
  export const segmentDetailStyles = {
    container: {
      position: "absolute",
      bottom: "5rem",
      right: "1rem",
      backgroundColor: "white",
      padding: "1rem",
      borderRadius: "0.5rem",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      maxWidth: "20rem",
      zIndex: "10",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    title: {
      fontWeight: "bold",
    },
    closeButton: {
      color: "#9ca3af",
      cursor: "pointer",
      background: "none",
      border: "none",
      fontSize: "1rem",
    },
    date: {
      fontSize: "0.875rem",
      color: "#4b5563",
      marginTop: "0.5rem",
    },
    typeIndicator: {
      display: "flex",
      alignItems: "center",
      marginTop: "0.5rem",
    },
    typeDot: (type) => ({
      width: "1rem",
      height: "1rem",
      borderRadius: "9999px",
      marginRight: "0.5rem",
      backgroundColor: getRouteColor(type),
    }),
    typeText: {
      fontSize: "0.875rem",
      textTransform: "capitalize",
    },
    details: {
      marginTop: "0.5rem",
    },
    detailItem: {
      fontSize: "0.875rem",
    },
  };
  
  /**
   * Styling for error messages
   */
  export const errorStyles = {
    container: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "rgba(239, 68, 68, 0.9)",
      color: "white",
      padding: "1rem",
      borderRadius: "0.5rem",
      zIndex: "20",
      maxWidth: "80%",
      textAlign: "center",
    },
    reloadButton: {
      marginTop: "0.5rem",
      padding: "0.25rem 0.75rem",
      backgroundColor: "white",
      color: "rgb(239, 68, 68)",
      borderRadius: "0.25rem",
      fontWeight: "bold",
      cursor: "pointer",
      border: "none",
    },
  };
  
  /**
   * Styling for loading state
   */
  export const loadingStyles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#f3f4f6",
    },
  };
  
  /**
   * Styling for map container
   */
  export const mapContainerStyles = {
    container: {
      height: "100%",
      width: "100%",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#e5e7eb",
      zIndex: "1",
    },
    loadingOverlay: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      textAlign: "center",
      color: "#4b5563",
    },
  };
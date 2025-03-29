/**
 * Format a date string to display format
 * @param {string} dateString - ISO format date string (YYYY-MM-DD)
 * @returns {string} Formatted date string (e.g., "Mon, Feb 16")
 */
export const formatDate = (dateString) => {
    const options = { weekday: "short", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  /**
   * Group items by date and sort chronologically
   * Works with both segments and stays in a unified timeline
   * @param {Array} items - Array of trip segments and stays
   * @returns {Array} Array of date groups with their items
   */
  export const groupSegmentsByDate = (items) => {
    if (!items || items.length === 0) return [];
  
    // Group items by date
    const groupedByDate = {};
    
    items.forEach(item => {
      // Use the item's date property (could be segment.date or stay.dateStart)
      const itemDate = item.date;
      
      if (!groupedByDate[itemDate]) {
        groupedByDate[itemDate] = [];
      }
      groupedByDate[itemDate].push(item);
    });
    
    // Convert the grouped object to an array of date groups
    return Object.entries(groupedByDate)
      .map(([date, segments]) => {
        const dateObj = new Date(date);
        return {
          date,
          dayOfWeek: dateObj.toLocaleDateString(undefined, { weekday: "short" }),
          dayOfMonth: dateObj.getDate(),
          month: dateObj.toLocaleDateString(undefined, { month: "short" }),
          segments, // This now contains both segments and stays for this date
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  /**
   * Get a date range string from start and end dates
   * @param {string} startDate - ISO format start date (YYYY-MM-DD)
   * @param {string} endDate - ISO format end date (YYYY-MM-DD)
   * @returns {string} Formatted date range (e.g., "Feb 16 - Feb 22, 2025")
   */
  export const getDateRangeString = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startMonth = start.toLocaleDateString(undefined, { month: "short" });
    const startDay = start.getDate();
    const endMonth = end.toLocaleDateString(undefined, { month: "short" });
    const endDay = end.getDate();
    const year = end.getFullYear();
    
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };
  
  /**
   * Truncate a string if it's longer than maxLength
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length before truncation
   * @returns {string} Truncated string with ellipsis if needed
   */
  export const truncateString = (str, maxLength) => {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
  };
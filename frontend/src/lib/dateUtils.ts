/**
 * Format a date string to a readable format
 * @param dateString ISO date string (e.g., "2024-08-04T14:30:00Z")
 * @returns Formatted string (e.g., "Aug 4, 2024 2:30 PM")
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format a date string to a short format (date only)
 * @param dateString ISO date string
 * @returns Formatted string (e.g., "Aug 4, 2024")
 */
export const formatDateShort = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format a date string to show time only
 * @param dateString ISO date string
 * @returns Formatted string (e.g., "2:30 PM")
 */
export const formatTime = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return 'Invalid time';
  }
};

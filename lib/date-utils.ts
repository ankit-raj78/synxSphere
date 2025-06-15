// Date utility functions for safe date formatting

/**
 * Safely format a date to locale string
 * @param date - Date string, Date object, or null/undefined
 * @param fallback - Fallback text when date is invalid
 * @returns Formatted date string or fallback
 */
export function formatDate(date: string | Date | null | undefined, fallback: string = 'Unknown date'): string {
  if (!date) return fallback
  
  try {
    const dateObj = new Date(date)
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return fallback
    }
    
    return dateObj.toLocaleDateString()
  } catch (error) {
    console.warn('Date formatting error:', error)
    return fallback
  }
}

/**
 * Safely format a date to locale string with time
 * @param date - Date string, Date object, or null/undefined
 * @param fallback - Fallback text when date is invalid
 * @returns Formatted date and time string or fallback
 */
export function formatDateTime(date: string | Date | null | undefined, fallback: string = 'Unknown date'): string {
  if (!date) return fallback
  
  try {
    const dateObj = new Date(date)
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return fallback
    }
    
    return dateObj.toLocaleString()
  } catch (error) {
    console.warn('Date formatting error:', error)
    return fallback
  }
}

/**
 * Safely format a date to relative time (e.g., "2 hours ago")
 * @param date - Date string, Date object, or null/undefined
 * @param fallback - Fallback text when date is invalid
 * @returns Relative time string or fallback
 */
export function formatRelativeTime(date: string | Date | null | undefined, fallback: string = 'Unknown date'): string {
  if (!date) return fallback
  
  try {
    const dateObj = new Date(date)
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return fallback
    }
    
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    // For older dates, fall back to regular date format
    return dateObj.toLocaleDateString()
  } catch (error) {
    console.warn('Relative time formatting error:', error)
    return fallback
  }
}

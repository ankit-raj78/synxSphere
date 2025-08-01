/**
 * Get the OpenDAW URL based on the current environment
 */
export function getOpenDAWUrl(): string {
  // Check if we have an environment variable first
  if (process.env.NEXT_PUBLIC_OPENDAW_URL) {
    return process.env.NEXT_PUBLIC_OPENDAW_URL;
  }

  // For client-side detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If we're on AWS (detecting by IP or hostname)
    if (hostname.includes('app.synctown.ai') || 
        hostname.includes('localhost') || 
        hostname === '127.0.0.1') {
      return 'https://app.synctown.ai:8080';
    }
  }

  // Default to localhost for development
  return 'https://localhost:8080';
}

/**
 * Get the OpenDAW origin for message handling
 */
export function getOpenDAWOrigin(): string {
  return getOpenDAWUrl();
}

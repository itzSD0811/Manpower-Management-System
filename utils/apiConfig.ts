// API URL configuration that works in both development and production
// In production (behind nginx proxy), use relative path
// In development, use localhost:3001
const getApiUrl = (): string => {
  // Check if we're in production by looking at the hostname
  // If hostname is localhost or 127.0.0.1, we're in development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
  }
  // Production: use relative path which will be proxied by nginx
  return '/api';
};

export const API_URL = getApiUrl();




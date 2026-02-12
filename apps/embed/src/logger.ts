/**
 * Conditional logger for embed script
 * Only logs in development mode (localhost or when debug=true query param is present)
 */

let isDebugMode = false;

// Check if we're in debug mode
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasDebugParam = urlParams.has('pfm_debug');
  
  isDebugMode = isLocalhost || hasDebugParam;
}

export const logger = {
  log(...args: any[]) {
    if (isDebugMode) {
      console.log(...args);
    }
  },
  
  warn(...args: any[]) {
    if (isDebugMode) {
      console.warn(...args);
    }
  },
  
  error(...args: any[]) {
    if (isDebugMode) {
      console.error(...args);
    }
  },
  
  info(...args: any[]) {
    if (isDebugMode) {
      console.info(...args);
    }
  },
};

/**
 * Simple logger utility
 */

export const logger = {
  info: (message: string, data?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  
  warn: (message: string, data?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data) : '');
  },
  
  error: (message: string, data?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, data ? JSON.stringify(data) : '');
  },
  
  debug: (message: string, data?: Record<string, any>) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data) : '');
    }
  }
};

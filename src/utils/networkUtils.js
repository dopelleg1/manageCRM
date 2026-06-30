/**
 * Retries an async operation with exponential backoff.
 * 
 * @param {Function} operation - The async function to retry.
 * @param {number} maxRetries - Maximum number of retries (default: 3).
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000).
 * @returns {Promise<any>} - The result of the operation.
 */
export const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should stop retrying
      // Don't retry on 4xx client errors (except 408 Request Timeout or 429 Too Many Requests)
      const status = error?.status || error?.code;
      const isClientError = status >= 400 && status < 500;
      const isRetryableClientError = status === 408 || status === 429;

      if (isClientError && !isRetryableClientError) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (i === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, i) + (Math.random() * 100);
      console.warn(`Operation failed. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`, error.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
/**
 * Error thrown when an API key is missing
 */
export class MissingApiKeyError extends Error {
  constructor(keyName: string) {
    super(`Missing API key: ${keyName}`);
    this.name = "MissingApiKeyError";
  }
}

/**
 * Utility functions for making API calls with authentication
 */

const API_URL = import.meta.env.VITE_FUN_API_URL;

/**
 * Get the authentication token from local storage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

/**
 * Set the authentication token in local storage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem("auth_token", token);
};

/**
 * Clear the authentication token from local storage
 */
export const clearAuthToken = (): void => {
  localStorage.removeItem("auth_token");
};

/**
 * Check if an authentication token exists
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

/**
 * Make an authenticated API request
 * @param endpoint The API endpoint to request
 * @param options Fetch options
 * @returns Promise with the API response
 */
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();

  // Build headers with authentication if available
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Make the request with authentication headers
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle unauthorized responses that might indicate an expired token
  if (response.status === 401 || response.status === 403) {
    // Clear the token on auth errors
    clearAuthToken();
  }

  return response;
};

/**
 * Make a GET request to the API
 */
export const apiGet = (endpoint: string, options: RequestInit = {}) => {
  return apiRequest(endpoint, {
    method: "GET",
    ...options,
  });
};

/**
 * Make a POST request to the API
 */
export const apiPost = (
  endpoint: string,
  data: any,
  options: RequestInit = {}
) => {
  return apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });
};

/**
 * Make a PATCH request to the API
 */
export const apiPatch = (
  endpoint: string,
  data: any,
  options: RequestInit = {}
) => {
  return apiRequest(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
    ...options,
  });
};

/**
 * Make a DELETE request to the API
 */
export const apiDelete = (endpoint: string, options: RequestInit = {}) => {
  return apiRequest(endpoint, {
    method: "DELETE",
    ...options,
  });
};

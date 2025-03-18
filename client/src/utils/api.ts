/**
 * API utility functions for making calls to various AI services
 */

import { getApiKey, hasApiKey } from "@/store/settingsStore";

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
 * Make a request to the OpenAI API
 * @param endpoint The API endpoint to call
 * @param data The request data
 * @returns The API response
 * @throws MissingApiKeyError if the OpenAI API key is not set
 */
export async function callOpenAI<T>(endpoint: string, data: any): Promise<T> {
  if (!hasApiKey("openaiKey")) {
    throw new MissingApiKeyError("openaiKey");
  }

  const apiKey = getApiKey("openaiKey");

  const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(
      error.error?.message || `OpenAI API error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Make a request to the Anthropic API
 * @param data The request data
 * @returns The API response
 * @throws MissingApiKeyError if the Anthropic API key is not set
 */
export async function callAnthropic<T>(data: any): Promise<T> {
  if (!hasApiKey("anthropicKey")) {
    throw new MissingApiKeyError("anthropicKey");
  }

  const apiKey = getApiKey("anthropicKey");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Anthropic API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Make a request to the OpenRouter API
 * @param data The request data
 * @returns The API response
 * @throws MissingApiKeyError if the OpenRouter API key is not set
 */
export async function callOpenRouter<T>(data: any): Promise<T> {
  if (!hasApiKey("openrouterKey")) {
    throw new MissingApiKeyError("openrouterKey");
  }

  const apiKey = getApiKey("openrouterKey");

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(
      error.error?.message || `OpenRouter API error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Make a request to the Gigaverse API
 * @param endpoint The API endpoint to call
 * @param method The HTTP method to use
 * @param data The request data (optional)
 * @returns The API response
 * @throws MissingApiKeyError if the Gigaverse token is not set
 */
export async function callGigaverse<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any
): Promise<T> {
  if (!hasApiKey("gigaverseToken")) {
    throw new MissingApiKeyError("gigaverseToken");
  }

  const token = getApiKey("gigaverseToken");

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }

  // Use the proxy path instead of direct API calls
  const baseUrl = import.meta.env.PROD
    ? "/gigaverse-api" // In production, use the proxy path
    : "https://api.gigaverse.io"; // In development, use direct API

  const response = await fetch(`${baseUrl}/${endpoint}`, options);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Gigaverse API error: ${response.status}`);
  }

  return response.json();
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

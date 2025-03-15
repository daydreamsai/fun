/**
 * API utility functions for making calls to various AI services
 */

import { getApiKey, hasApiKey } from "./settings";

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
      "x-api-key": apiKey,
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

  const response = await fetch(`https://api.gigaverse.io/${endpoint}`, options);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Gigaverse API error: ${response.status}`);
  }

  return response.json();
}

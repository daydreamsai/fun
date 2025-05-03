// path: src/client/HttpClient.ts

import { Logger } from "@daydreamsai/core";

/**
 * Minimal HTTP client that wraps fetch calls with logging.
 */
export class HttpClient {
  private logger: Logger;

  private readonly baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string, logger: Logger) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.logger = logger;
  }

  public setAuthToken(newToken: string) {
    this.authToken = newToken;
  }

  /**
   * Sends a POST request with the current auth token.
   */
  public async post<T>(
    endpoint: string,
    body: Record<string, any>
  ): Promise<T> {
    this.logger.info("gigaverse-http-client", `POST -> ${endpoint}`);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        Accept: "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        "gigaverse-http-client",
        `HTTP error ${response.status}: ${errorBody}`
      );
      throw new Error(`POST ${endpoint} failed -> ${response.status}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Sends a GET request with the current auth token.
   */
  public async get<T>(endpoint: string): Promise<T> {
    this.logger.info("gigaverse-http-client", `GET -> ${endpoint}`);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        "gigaverse-http-client",
        `HTTP error ${response.status}: ${errorBody}`
      );
      throw new Error(`GET ${endpoint} failed -> ${response.status}`);
    }

    return (await response.json()) as T;
  }
}

import { TORII_URL } from "../constants";
import { entity_updated_subscription } from "./gql_querys";

export interface EntityUpdatedEvent {
  id: string;
  keys: string[];
  eventId: string;
  models: Array<
    | {
        __typename: "ponzi_land_NewAuctionEvent";
        land_location: number;
        start_price: string;
        floor_price: string;
      }
    | {
        __typename: "ponzi_land_AddStakeEvent";
        land_location: number;
        new_stake_amount: string;
        owner: string;
      }
    | {
        __typename: "ponzi_land_LandBoughtEvent";
        land_location: number;
        sold_price: string;
        token_used: string;
        buyer: string;
        seller: string;
      }
  >;
}

export interface SubscriptionResponse {
  data: {
    entityUpdated: EntityUpdatedEvent;
  };
}

export class GraphQLSubscriptionClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscriptions = new Map<string, (data: any) => void>();
  private isConnected = false;

  constructor(private url: string) {}

  private getWebSocketUrl(): string {
    // Convert HTTP URL to WebSocket URL
    const wsUrl = this.url.replace(/^http/, "ws");
    return `${wsUrl}/graphql/ws`;
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log("Connecting to WebSocket:", this.getWebSocketUrl());
        this.ws = new WebSocket(this.getWebSocketUrl(), "graphql-ws");

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Send connection init message
          this.send({
            type: "connection_init",
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket closed:", event.code, event.reason);
          this.isConnected = false;
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case "connection_ack":
        console.log("Connection acknowledged");
        break;
      case "data":
        if (message.id && this.subscriptions.has(message.id)) {
          const callback = this.subscriptions.get(message.id)!;
          callback(message.payload);
        }
        break;
      case "error":
        console.error("Subscription error:", message.payload);
        break;
      case "complete":
        console.log("Subscription completed:", message.id);
        break;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  public async subscribe<T = any>(
    query: string,
    variables: any = {},
    callback: (data: T) => void
  ): Promise<string> {
    if (!this.isConnected) {
      await this.connect();
    }

    const id = this.generateId();
    this.subscriptions.set(id, callback);

    this.send({
      id,
      type: "start",
      payload: {
        query,
        variables,
      },
    });

    return id;
  }

  public unsubscribe(id: string) {
    this.subscriptions.delete(id);
    this.send({
      id,
      type: "stop",
    });
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.isConnected = false;
  }

  // Convenience method for entity updates subscription
  public async subscribeToEntityUpdates(
    callback: (data: SubscriptionResponse) => void
  ): Promise<string> {
    return this.subscribe(entity_updated_subscription, {}, callback);
  }
}

// Create a singleton instance
export const subscriptionClient = new GraphQLSubscriptionClient(TORII_URL);

// Helper function to easily start listening to entity updates
export function subscribeToEntityUpdates(
  callback: (event: EntityUpdatedEvent) => void
): Promise<string> {
  return subscriptionClient.subscribeToEntityUpdates((response) => {
    callback(response.data.entityUpdated);
  });
}

// Helper function to handle specific event types
export function subscribeToAuctionEvents(
  callback: (event: {
    __typename: "ponzi_land_NewAuctionEvent";
    land_location: number;
    start_price: string;
    floor_price: string;
  }) => void
): Promise<string> {
  return subscribeToEntityUpdates((event) => {
    event.models.forEach((model) => {
      if (model.__typename === "ponzi_land_NewAuctionEvent") {
        callback(model);
      }
    });
  });
}

export function subscribeToStakeEvents(
  callback: (event: {
    __typename: "ponzi_land_AddStakeEvent";
    land_location: number;
    new_stake_amount: string;
    owner: string;
  }) => void
): Promise<string> {
  return subscribeToEntityUpdates((event) => {
    event.models.forEach((model) => {
      if (model.__typename === "ponzi_land_AddStakeEvent") {
        callback(model);
      }
    });
  });
}

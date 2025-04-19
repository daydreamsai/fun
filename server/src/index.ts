import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";

import { PublicKey } from "@solana/web3.js";
import {
  CREDIT_PRICE_PER_UNIT,
  CREDITS_TO_DOLLARS_RATIO,
  OPENROUTER_BASE_URL,
  OPENROUTER_PROVISIONING_API_KEY,
  stripeClient,
  supabase,
} from "./config";
import { decodeBase58, verifyUser } from "./utils";
import type {
  AddCreditsRequest,
  AddCreditsResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  DeleteOpenRouterKeyResponse,
  ErrorResponse,
  GetOpenRouterCreditsResponse,
  GetOpenRouterKeyResponse,
  GetUserResponse,
  OpenRouterKeyData,
  PaymentSuccessQueryParams,
  PaymentSuccessResponse,
  ProvisionOpenRouterKeyRequest,
  ProvisionOpenRouterKeyResponse,
  StripeWebhookResponse,
  SyncCreditsResponse,
  UpdateOpenRouterKeyRequest,
  UpdateOpenRouterKeyResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UseCreditsRequest,
  UseCreditsResponse,
  User,
  UserIdParams,
  VerifyLoginRequest,
  VerifyLoginResponse,
  WalletAddressParams,
} from "./types";
import { env } from "./env";

const app = express();
const PORT = env.PORT;

app.use(cors());

app.use((req, res, next) => {
  if (req.originalUrl === "/api/webhook") {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

app.post<
  never,
  CreateCheckoutSessionResponse | ErrorResponse,
  CreateCheckoutSessionRequest
>("/api/create-checkout-session", async (req, res): Promise<any> => {
  try {
    const { creditAmount, userId, userEmail } = req.body;

    if (
      typeof creditAmount !== "number" ||
      typeof userId !== "string" ||
      typeof userEmail !== "string"
    ) {
      return res.status(400).json({ error: "Invalid request body types" });
    }

    if (!userId) {
      // Keep check for userId specifically if it's mandatory beyond type
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate credit amount
    const credits = creditAmount; // Already a number from request type
    if (isNaN(credits) || credits <= 0) {
      return res.status(400).json({ error: "Invalid credit amount" });
    }

    // Calculate equivalent dollars for OpenRouter (1 credit = $0.06)
    const openRouterDollars = credits * CREDITS_TO_DOLLARS_RATIO;

    // Create a Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Credits Purchase",
              description: `${credits} Credits`,
            },
            unit_amount: CREDIT_PRICE_PER_UNIT,
          },
          quantity: credits,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/profile`,
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: {
        userId,
        displayCredits: credits.toString(),
        openRouterDollars: openRouterDollars.toString(),
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Webhook to handle successful payments
app.post<never, StripeWebhookResponse | ErrorResponse>(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<any> => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      console.error(`Webhook signature missing.`);
      return res.status(400).send({ error: "Webhook signature missing." });
    }

    let event;
    try {
      event = await stripeClient.webhooks.constructEventAsync(
        req.body, // Body is raw buffer here
        signature, // Signature is now checked for existence
        env.STRIPE_WEBHOOK_SECRET // Use validated env var
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any; // Use 'as any' or define a Stripe Session type

      // Verify that payment was successful
      if (session.payment_status === "paid") {
        try {
          // Add null checks for metadata
          if (
            !session.metadata ||
            !session.metadata.userId ||
            !session.metadata.displayCredits ||
            !session.metadata.openRouterDollars
          ) {
            throw new Error("Missing metadata in Stripe session");
          }

          const userId = session.metadata.userId;
          const displayCredits = parseInt(session.metadata.displayCredits, 10);
          const openRouterDollars = parseFloat(
            session.metadata.openRouterDollars
          );

          if (isNaN(displayCredits) || isNaN(openRouterDollars)) {
            throw new Error(`Invalid values in metadata`);
          }

          // Fetch the current user
          const { data: user, error: fetchError } = await supabase
            .from("users")
            .select("credits, openrouter_key_hash")
            .eq("id", userId)
            .single();

          if (fetchError) {
            throw new Error(`Error fetching user: ${fetchError.message}`);
          }

          // If user has an OpenRouter key, update its limit
          if (user.openrouter_key_hash) {
            // Get current key data to determine current limit
            const keyResponse = await fetch(
              `${OPENROUTER_BASE_URL}/${user.openrouter_key_hash}`,
              {
                headers: {
                  Authorization: `Bearer ${OPENROUTER_PROVISIONING_API_KEY}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (!keyResponse.ok) {
              throw new Error(
                `Error fetching API key: ${keyResponse.statusText}`
              );
            }

            const keyData = await keyResponse.json();
            const currentLimit = keyData.data.limit || 0;
            const newLimit = currentLimit + openRouterDollars;

            // Update the key with new limit (in dollars)
            const updateResponse = await fetch(
              `${OPENROUTER_BASE_URL}/${user.openrouter_key_hash}`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${OPENROUTER_PROVISIONING_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  limit: newLimit,
                }),
              }
            );

            if (!updateResponse.ok) {
              throw new Error(
                `Error updating API key: ${updateResponse.statusText}`
              );
            }
          }

          // Update the user's display credits in Supabase
          // This is just for display purposes now, not the source of truth
          const currentCredits = user.credits || 0;
          const newCredits = currentCredits + displayCredits;

          const { error: updateError } = await supabase
            .from("users")
            .update({
              credits: newCredits,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (updateError) {
            throw new Error(
              `Error updating user credits: ${updateError.message}`
            );
          }

          console.log(
            `Added ${displayCredits} display credits ($${openRouterDollars} in OpenRouter) to user ${userId}.`
          );
        } catch (error) {
          console.error("Error processing successful payment:", error);
          // We don't return an error status here to acknowledge receipt of the webhook
        }
      }
    }

    // Return a 200 response to acknowledge receipt of the webhook
    res.json({ received: true });
  }
);

// Payment success endpoint
app.get<
  never,
  PaymentSuccessResponse | ErrorResponse,
  never,
  PaymentSuccessQueryParams
>("/api/payment-success", async (req, res): Promise<any> => {
  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== "string") {
      return res.status(400).json({ error: "Missing or invalid session ID" });
    }

    // Retrieve the session to verify it was successful
    const session = await stripeClient.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    // Add null checks for metadata before accessing
    if (
      !session.metadata ||
      !session.metadata.displayCredits ||
      !session.metadata.openRouterDollars ||
      !session.metadata.userId
    ) {
      console.error(
        "Missing metadata in successful Stripe session:",
        session_id
      );
      return res.status(500).json({
        error: "Failed to retrieve payment details from session metadata",
      });
    }

    // Return success response with session details
    res.json({
      success: true,
      displayCredits: parseInt(session.metadata.displayCredits, 10),
      openRouterDollars: parseFloat(session.metadata.openRouterDollars),
      userId: session.metadata.userId,
    });
  } catch (error) {
    console.error("Error verifying payment success:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

app.get<UserIdParams, GetOpenRouterKeyResponse | ErrorResponse>(
  "/api/openrouter/key/:userId",
  async (req, res): Promise<any> => {
    try {
      const { userId } = req.params;

      // Verify user exists (using placeholder)
      await verifyUser(userId);

      // Check if user already has an API key hash stored
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("openrouter_key_hash")
        .eq("id", userId)
        .single();

      if (userError) {
        throw new Error(`Error fetching user data: ${userError.message}`);
      }

      // If user has a key hash, fetch the key details from OpenRouter
      if (userData.openrouter_key_hash) {
        const response = await fetch(
          `${OPENROUTER_BASE_URL}/${userData.openrouter_key_hash}`,
          {
            headers: {
              Authorization: `Bearer ${OPENROUTER_PROVISIONING_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          // If key doesn't exist anymore, we'll need to create a new one
          if (response.status === 404) {
            return res
              .status(404)
              .json({ error: "API key not found, please provision a new one" });
          }
          throw new Error(`Error fetching API key: ${response.statusText}`);
        }

        const keyData = await response.json();

        // Update the user's display credits in Supabase to match OpenRouter
        // Convert dollars to credits (with margin adjustment)
        const openRouterDollars = keyData.data.limit || 0;
        // If $0.06 in OpenRouter = 1 credit, then 1 dollar = 16.67 credits
        const displayCredits = Math.round(
          openRouterDollars / CREDITS_TO_DOLLARS_RATIO
        );

        await supabase
          .from("users")
          .update({
            credits: displayCredits,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        return res.json({
          keyData,
          displayCredits,
          openRouterDollars,
        });
      } else {
        // User doesn't have a key yet
        return res.status(404).json({ error: "No API key found for user" });
      }
    } catch (error) {
      console.error("Error getting API key:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Provision a new API key for user
app.post<
  never,
  ProvisionOpenRouterKeyResponse | ErrorResponse,
  ProvisionOpenRouterKeyRequest
>("/api/openrouter/key", async (req, res): Promise<any> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing user ID" });
    }

    // Verify user exists and get user data (using placeholder)
    const user = await verifyUser(userId);

    // Create a unique name for the key
    const keyName = `User-${userId.substring(0, 8)}-${Date.now()}`;

    // Get the user's current display credits
    const displayCredits = user.credits || 0;

    // Convert to dollars for OpenRouter
    const openRouterDollars = displayCredits * CREDITS_TO_DOLLARS_RATIO;

    // Create a new API key
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_PROVISIONING_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: keyName,
        label: `user-${userId.substring(0, 8)}`,
        limit: 0.01, // Set limit in dollars
      }),
    });

    if (!response.ok) {
      throw new Error(`Error creating API key: ${response.statusText}`);
    }

    const keyData = await response.json();

    // Store the key hash in the user's profile
    const { error: updateError } = await supabase
      .from("users")
      .update({
        openrouter_key_hash: keyData.data.hash,
        openrouter_key: keyData.key,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      throw new Error(
        `Error updating user with key hash: ${updateError.message}`
      );
    }

    // Return the full key data to the client along with display credits
    res.json({
      keyData,
      displayCredits,
      openRouterDollars,
    });
  } catch (error: any) {
    console.error("Error provisioning API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user's API key (e.g., to change credit limit)
app.patch<
  UserIdParams,
  UpdateOpenRouterKeyResponse | ErrorResponse,
  UpdateOpenRouterKeyRequest
>("/api/openrouter/key/:userId", async (req, res): Promise<any> => {
  try {
    const { userId } = req.params;
    const { disabled, newDisplayLimit } = req.body;

    // Verify user exists (using placeholder)
    const user = await verifyUser(userId);

    if (!user.openrouter_key_hash) {
      return res.status(404).json({ error: "No API key found for user" });
    }

    // Calculate dollars for OpenRouter if a new display limit is provided
    const newDollarLimit =
      newDisplayLimit !== undefined
        ? newDisplayLimit * CREDITS_TO_DOLLARS_RATIO
        : undefined;

    // Update the key
    const response = await fetch(
      `${OPENROUTER_BASE_URL}/${user.openrouter_key_hash}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${OPENROUTER_PROVISIONING_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disabled: disabled !== undefined ? disabled : undefined,
          limit: newDollarLimit !== undefined ? newDollarLimit : undefined,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Error updating API key: ${response.statusText}`);
    }

    const keyData = await response.json();

    // If we updated the limit, also update the display credits in Supabase
    if (newDisplayLimit !== undefined) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          credits: newDisplayLimit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error(
          `Error updating user display credits: ${updateError.message}`
        );
      }
    }

    res.json({
      keyData,
      displayCredits: newDisplayLimit,
      openRouterDollars: newDollarLimit,
    });
  } catch (error: any) {
    console.error("Error updating API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user's API key
app.delete<UserIdParams, DeleteOpenRouterKeyResponse | ErrorResponse>(
  "/api/openrouter/key/:userId",
  async (req, res): Promise<any> => {
    try {
      const { userId } = req.params;

      // Verify user exists (using placeholder)
      const user = await verifyUser(userId);

      if (!user.openrouter_key_hash) {
        return res.status(404).json({ error: "No API key found for user" });
      }

      // Delete the key
      const response = await fetch(
        `${OPENROUTER_BASE_URL}/${user.openrouter_key_hash}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${OPENROUTER_PROVISIONING_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error deleting API key: ${response.statusText}`);
      }

      // Remove the key hash from the user's profile
      const { error: updateError } = await supabase
        .from("users")
        .update({
          openrouter_key_hash: null,
          openrouter_key: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error(
          `Error updating user after key deletion: ${updateError.message}`
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Sync user's credit limit with OpenRouter
app.post<UserIdParams, SyncCreditsResponse | ErrorResponse>(
  "/api/openrouter/sync-credits/:userId",
  async (req, res): Promise<any> => {
    try {
      const { userId } = req.params;

      // Verify user exists (using placeholder)
      const user = await verifyUser(userId);

      if (!user.openrouter_key_hash) {
        return res.status(404).json({ error: "No API key found for user" });
      }

      // Get the current key data from OpenRouter (source of truth)
      const getResponse = await fetch(
        `${OPENROUTER_BASE_URL}/${user.openrouter_key_hash}`,
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_PROVISIONING_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!getResponse.ok) {
        throw new Error(`Error fetching API key: ${getResponse.statusText}`);
      }

      const keyData = await getResponse.json();
      const openRouterDollars = keyData.data.limit || 0;

      // Convert dollars to display credits (with margin adjustment)
      const displayCredits = Math.round(
        openRouterDollars / CREDITS_TO_DOLLARS_RATIO
      );

      // Update the user's display credits in Supabase
      const { error: updateError } = await supabase
        .from("users")
        .update({
          credits: displayCredits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error(
          `Error updating user display credits: ${updateError.message}`
        );
      }

      res.json({
        keyData,
        displayCredits,
        openRouterDollars,
      });
    } catch (error: any) {
      console.error("Error syncing credits:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Fetch credits directly from OpenRouter
app.get<UserIdParams, GetOpenRouterCreditsResponse | ErrorResponse>(
  "/api/openrouter/credits/:userId",
  async (req, res): Promise<any> => {
    try {
      const { userId } = req.params;

      // Verify user exists (using placeholder)
      const user = await verifyUser(userId);

      if (!user.openrouter_key_hash) {
        return res.status(404).json({ error: "No API key found for user" });
      }

      // Get the user's API key from OpenRouter
      const keyResponse = await fetch(
        `${OPENROUTER_BASE_URL}/${user.openrouter_key_hash}`,
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_PROVISIONING_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!keyResponse.ok) {
        throw new Error(`Error fetching API key: ${keyResponse.statusText}`);
      }

      const keyData = await keyResponse.json();

      // Calculate remaining credits based on OpenRouter data
      const openRouterDollars = keyData.data.limit || 0;
      const openRouterUsed = keyData.data.usage || 0;
      const openRouterRemaining = openRouterDollars - openRouterUsed;

      // Convert to display credits
      const totalDisplayCredits = Math.round(
        openRouterDollars / CREDITS_TO_DOLLARS_RATIO
      );
      const usedDisplayCredits = Math.round(
        openRouterUsed / CREDITS_TO_DOLLARS_RATIO
      );
      const remainingDisplayCredits = Math.round(
        openRouterRemaining / CREDITS_TO_DOLLARS_RATIO
      );

      // Calculate usage percentage
      const usagePercentage =
        openRouterDollars > 0
          ? Math.min(
              Math.round((openRouterUsed / openRouterDollars) * 100),
              100
            )
          : 0;

      res.json({
        openRouter: {
          totalDollars: openRouterDollars,
          usedDollars: openRouterUsed,
          remainingDollars: openRouterRemaining,
        },
        display: {
          totalCredits: totalDisplayCredits,
          usedCredits: usedDisplayCredits,
          remainingCredits: remainingDisplayCredits,
          usagePercentage,
        },
      });
    } catch (error: any) {
      console.error("Error fetching OpenRouter credits:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Signature-based login verification
app.post<never, VerifyLoginResponse | ErrorResponse, VerifyLoginRequest>(
  "/api/user/login/verify",
  async (req, res): Promise<any> => {
    try {
      const { walletAddress, signature, message, timestamp } = req.body;

      if (!walletAddress || !signature || !message) {
        return res.status(400).json({
          error: "Wallet address, signature, and message are required",
        });
      }

      // Verify the message format
      const expectedMessagePrefix = `I am signing this message to prove I own the wallet ${walletAddress}`;
      if (!message.startsWith(expectedMessagePrefix)) {
        return res.status(400).json({ error: "Invalid message format" });
      }

      // Parse timestamp from message if not provided separately
      let messageTimestamp =
        typeof timestamp === "number" ? timestamp : undefined;
      if (messageTimestamp === undefined) {
        const timestampMatch = message.match(/Timestamp: (\d+)/);
        if (timestampMatch && timestampMatch[1]) {
          messageTimestamp = parseInt(timestampMatch[1]);
        } else {
          return res
            .status(400)
            .json({ error: "Timestamp not found in message" });
        }
      }

      // Verify the timestamp is recent (within 5 minutes)
      const currentTime = Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;

      if (currentTime - messageTimestamp > fiveMinutesMs) {
        return res.status(400).json({
          error: "Signature expired. Please try again with a fresh signature.",
        });
      }

      // Verify the signature
      let isSignatureValid = false;
      try {
        // Convert the message to Uint8Array
        const messageUint8 = new TextEncoder().encode(message);

        // Convert the signature from base58 to Uint8Array using our custom decoder (placeholder)
        const signatureUint8 = decodeBase58(signature);

        // Get the public key
        const publicKey = new PublicKey(walletAddress);

        // Verify the signature
        isSignatureValid = nacl.sign.detached.verify(
          messageUint8,
          signatureUint8,
          publicKey.toBytes()
        );
      } catch (verificationError) {
        console.error("Signature verification error:", verificationError);
        return res.status(401).json({ error: "Invalid signature format" });
      }

      if (!isSignatureValid) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      // At this point, signature is verified - find or create the user
      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", walletAddress)
        .single();

      // If there's an error but it's not a "not found" error, throw it
      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      let user;

      if (existingUser) {
        // User exists, update last login time
        const { data: updatedUser, error: updateError } = await supabase
          .from("users")
          .update({
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", walletAddress)
          .select("*")
          .single();

        if (updateError) throw updateError;
        user = updatedUser;
      } else {
        // User doesn't exist, create new user
        const newUser = {
          id: walletAddress,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          credits: 0,
        };

        const { data: createdUser, error: insertError } = await supabase
          .from("users")
          .insert(newUser)
          .select("*")
          .single();

        if (insertError) {
          // If we get a duplicate key error, the user might have been created in another session
          // Try to fetch the user again
          if (insertError.code === "23505") {
            const { data: refetchedUser, error: refetchError } = await supabase
              .from("users")
              .select("*")
              .eq("id", walletAddress)
              .single();

            if (refetchError) throw refetchError;

            // Update the last login time
            const { data: reUpdatedUser, error: reUpdateError } = await supabase
              .from("users")
              .update({
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", walletAddress)
              .select("*")
              .single();

            if (reUpdateError) throw reUpdateError;
            user = reUpdatedUser;
          } else {
            throw insertError;
          }
        } else {
          user = createdUser;
        }
      }

      // Create a JWT token for authenticated sessions
      // This adds an extra layer of security for subsequent requests
      const token = jwt.sign(
        {
          userId: user.id,
          verificationMethod: "signature",
          iat: Math.floor(Date.now() / 1000),
        },
        env.JWT_SECRET, // Use validated env var
        { expiresIn: "7d" }
      );

      // Send back the user data and token
      return res.json({ user, token });
    } catch (error) {
      console.error("Signature verification error:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during signature verification",
      });
    }
  }
);

// Get user by wallet address
app.get<WalletAddressParams, GetUserResponse | ErrorResponse>(
  "/api/user/:walletAddress",
  async (req, res) => {
    try {
      const { walletAddress } = req.params;

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", walletAddress)
        .single();

      if (error) throw error;
      res.json({ user });
    } catch (error) {
      console.error("Fetch user error:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error fetching user",
      });
    }
  }
);

// Update user
app.patch<
  WalletAddressParams,
  UpdateUserResponse | ErrorResponse,
  UpdateUserRequest
>("/api/user/:walletAddress", async (req, res): Promise<any> => {
  try {
    const { walletAddress } = req.params;
    const updates = req.body;

    if (!updates) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletAddress)
      .select("*")
      .single();

    if (error) throw error;
    res.json({ user: updatedUser });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Unknown error during update",
    });
  }
});

// Add credits to user
app.post<
  WalletAddressParams,
  AddCreditsResponse | ErrorResponse,
  AddCreditsRequest
>("/api/user/:walletAddress/add-credits", async (req, res): Promise<any> => {
  try {
    const { walletAddress } = req.params;
    const { amount } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    // Get current user
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("credits")
      .eq("id", walletAddress)
      .single();

    if (fetchError) throw fetchError;

    const newCredits = (currentUser.credits || 0) + amount;

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletAddress)
      .select("*")
      .single();

    if (error) throw error;
    res.json({
      user: updatedUser,
      message: `Added ${amount} credits. New balance: ${updatedUser.credits}`,
    });
  } catch (error) {
    console.error("Add credits error:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Unknown error adding credits",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

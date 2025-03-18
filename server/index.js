const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const stripe = require("stripe");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nacl = require("tweetnacl");
const bs58 = require("bs58");
const { PublicKey } = require("@solana/web3.js");

// Custom base58 implementation in case the bs58 library doesn't work properly with Bun
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  ALPHABET_MAP[BASE58_ALPHABET[i]] = i;
}

function decodeBase58(str) {
  if (typeof bs58.decode === "function") {
    // Use the library if available
    try {
      return bs58.decode(str);
    } catch (err) {
      console.log(
        "bs58.decode error, falling back to custom implementation",
        err
      );
    }
  }

  // Custom implementation
  let result = new Uint8Array(str.length * 2); // Pre-allocate enough space
  let resultLen = 0;
  let value = 0;
  let carry = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const digit = ALPHABET_MAP[char];

    if (digit === undefined) {
      throw new Error(`Invalid base58 character: ${char}`);
    }

    value = value * 58 + digit;

    let j = 0;
    for (; j < resultLen || value > 0; j++) {
      const newValue = (result[j] || 0) * 58 + value;
      result[j] = newValue & 0xff;
      value = Math.floor(newValue / 256);
    }
    resultLen = j;
  }

  // Count leading zeros in the input
  let inputZeros = 0;
  for (let i = 0; i < str.length && str[i] === "1"; i++) {
    inputZeros++;
  }

  // Create the final result with the correct length
  const finalResult = new Uint8Array(inputZeros + resultLen);

  // Copy result in reverse order
  let j = inputZeros;
  for (let i = 0; i < resultLen; i++) {
    finalResult[j++] = result[resultLen - 1 - i];
  }

  return finalResult;
}

// Verify bs58 loading
console.log(
  "bs58 loaded:",
  typeof bs58,
  "decode available:",
  typeof bs58.decode
);
console.log("Using custom base58 decoder as fallback if needed");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Stripe
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenRouter API configuration
const OPENROUTER_PROVISIONING_API_KEY =
  process.env.OPENROUTER_PROVISIONING_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/keys";

// Middleware
app.use(cors());

// Use JSON parser for all routes except the webhook
app.use((req, res, next) => {
  if (req.originalUrl === "/api/webhook") {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

// Auth middleware for protected routes
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
      (err, user) => {
        if (err) {
          return res.status(403).json({ error: "Invalid or expired token" });
        }

        req.user = user;
        next();
      }
    );
  } else {
    // Allow the request to proceed without authentication for backwards compatibility
    // You can make this more strict by uncommenting the line below to reject requests without tokens
    // return res.status(401).json({ error: 'Authentication token required' });
    next();
  }
};

// Credit pricing
const CREDIT_PRICE_PER_UNIT = 10; // $0.10 per credit in cents
// Apply 40% margin - each credit is worth $0.06 in OpenRouter (60% of the price)
const CREDITS_TO_DOLLARS_RATIO = 0.06; // 60% of $0.10

// Helper function to verify user exists
async function verifyUser(userId) {
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`User verification failed: ${error.message}`);
  }

  return user;
}

// Routes
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { creditAmount, userId, userEmail } = req.body;

    if (!creditAmount || !userId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate credit amount
    const credits = parseInt(creditAmount, 10);
    if (isNaN(credits) || credits <= 0) {
      return res.status(400).json({ error: "Invalid credit amount" });
    }

    // Calculate price in cents
    const priceInCents = Math.round(credits * CREDIT_PRICE_PER_UNIT);

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
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;
    try {
      event = await stripeClient.webhooks.constructEventAsync(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Verify that payment was successful
      if (session.payment_status === "paid") {
        try {
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
app.get("/api/payment-success", async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: "Missing session ID" });
    }

    // Retrieve the session to verify it was successful
    const session = await stripeClient.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
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

// OpenRouter API Key Management Endpoints

// Get user's API key
app.get("/api/openrouter/key/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
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
    res.status(500).json({ error: error.message });
  }
});

// Provision a new API key for user
app.post("/api/openrouter/key", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing user ID" });
    }

    // Verify user exists and get user data
    const user = await verifyUser(userId);

    // Create a unique name for the key
    const keyName = `User-${userId.substring(0, 8)}-${Date.now()}`;

    // Get the user's current display credits
    const displayCredits = user.credits || 0;
    // Convert to dollars for OpenRouter
    const openRouterDollars = displayCredits * CREDITS_TO_DOLLARS_RATIO;

    console.log({
      name: keyName,
      label: `user-${userId.substring(0, 8)}`,
      limit: 0, // Set limit in dollars
    });

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
  } catch (error) {
    console.error("Error provisioning API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user's API key (e.g., to change credit limit)
app.patch("/api/openrouter/key/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { disabled, newDisplayLimit } = req.body;

    // Verify user exists
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
  } catch (error) {
    console.error("Error updating API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user's API key
app.delete("/api/openrouter/key/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
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
  } catch (error) {
    console.error("Error deleting API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// Sync user's credit limit with OpenRouter
app.post("/api/openrouter/sync-credits/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
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
  } catch (error) {
    console.error("Error syncing credits:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch credits directly from OpenRouter
app.get("/api/openrouter/credits/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
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
        ? Math.min(Math.round((openRouterUsed / openRouterDollars) * 100), 100)
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
  } catch (error) {
    console.error("Error fetching OpenRouter credits:", error);
    res.status(500).json({ error: error.message });
  }
});

// User Management Endpoints

// Login or create user - Legacy endpoint (now disabled)
app.post("/api/user/login", async (req, res) => {
  return res.status(403).json({
    error:
      "Legacy login is disabled. Please use signature-based authentication.",
  });
});

// Signature-based login verification
app.post("/api/user/login/verify", async (req, res) => {
  try {
    const { walletAddress, signature, message, timestamp } = req.body;

    if (!walletAddress || !signature || !message) {
      return res
        .status(400)
        .json({ error: "Wallet address, signature, and message are required" });
    }

    // Verify the message format
    const expectedMessagePrefix = `I am signing this message to prove I own the wallet ${walletAddress}`;
    if (!message.startsWith(expectedMessagePrefix)) {
      return res.status(400).json({ error: "Invalid message format" });
    }

    // Parse timestamp from message if not provided separately
    let messageTimestamp = timestamp;
    if (!messageTimestamp) {
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

      // Convert the signature from base58 to Uint8Array using our custom decoder
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
      process.env.JWT_SECRET || "your-secret-key",
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
});

// Get user by wallet address
app.get("/api/user/:walletAddress", async (req, res) => {
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
        error instanceof Error ? error.message : "Unknown error fetching user",
    });
  }
});

// Update user
app.patch("/api/user/:walletAddress", async (req, res) => {
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
app.post("/api/user/:walletAddress/add-credits", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
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

// Use credits
app.post("/api/user/:walletAddress/use-credits", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    // Get current user
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("credits")
      .eq("id", walletAddress)
      .single();

    if (fetchError) throw fetchError;

    if ((currentUser.credits || 0) < amount) {
      return res.status(400).json({ error: "Insufficient credits" });
    }

    const newCredits = (currentUser.credits || 0) - amount;

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
      success: true,
      message: `Used ${amount} credits. New balance: ${updatedUser.credits}`,
    });
  } catch (error) {
    console.error("Use credits error:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Unknown error using credits",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

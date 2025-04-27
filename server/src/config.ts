import { createClient } from "@supabase/supabase-js";

import stripe from "stripe";

import { env } from "./env";

// Initialize Stripe
export const stripeClient = new stripe(env.STRIPE_SECRET_KEY);

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// OpenRouter API configuration
export const OPENROUTER_PROVISIONING_API_KEY =
  env.OPENROUTER_PROVISIONING_API_KEY;
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/keys";

// Credit pricing
export const CREDIT_PRICE_PER_UNIT = 10; // $0.10 per credit in cents

// Apply 40% margin - each credit is worth $0.06 in OpenRouter (60% of the price)
export const CREDITS_TO_DOLLARS_RATIO = 0.06; // 60% of $0.10

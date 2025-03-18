import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

// These environment variables need to be set in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(
  supabaseUrl || "",
  supabaseAnonKey || ""
);

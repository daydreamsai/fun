export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string; // Solana address as primary key
          created_at: string;
          updated_at: string;
          display_name: string | null;
          email: string | null;
          avatar_url: string | null;
          last_login: string | null;
          credits: number;
          settings: Json | null;
          openrouter_key_hash: string | null;
          openrouter_key: string | null;
        };
        Insert: {
          id: string; // Solana address
          created_at?: string;
          updated_at?: string;
          display_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          last_login?: string | null;
          credits?: number;
          settings?: Json | null;
          openrouter_key_hash?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          display_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          last_login?: string | null;
          credits?: number;
          settings?: Json | null;
          openrouter_key_hash?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

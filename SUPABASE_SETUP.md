# Supabase Setup for User Database

This project uses Supabase as the database for storing user information, with Solana wallet addresses as the primary identifier.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Choose a name and password for your project
4. Wait for the project to be created

### 2. Create the Users Table

1. In your Supabase project, go to the SQL Editor
2. Create a new query and paste the following SQL:

```sql
CREATE TABLE public.users (
  id TEXT PRIMARY KEY, -- Solana wallet address
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  settings JSONB
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to read any user
CREATE POLICY "Allow public read access" ON public.users
  FOR SELECT USING (true);

-- Allow anyone to insert users (for wallet-based authentication)
CREATE POLICY "Allow public insert access" ON public.users
  FOR INSERT WITH CHECK (true);

-- Allow users to update only their own data
-- This assumes you'll implement client-side validation to ensure
-- users can only update their own data
CREATE POLICY "Allow update for own user" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);
```

3. Run the query to create the table and security policies

### 3. Get API Keys

1. In your Supabase project, go to Project Settings > API
2. Copy the URL and anon key
3. Add these to your `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

The `users` table has the following structure:

| Column       | Type      | Description                         |
| ------------ | --------- | ----------------------------------- |
| id           | TEXT      | Primary key - Solana wallet address |
| created_at   | TIMESTAMP | When the user was created           |
| updated_at   | TIMESTAMP | When the user was last updated      |
| display_name | TEXT      | User's display name                 |
| email        | TEXT      | User's email address                |
| avatar_url   | TEXT      | URL to user's avatar image          |
| last_login   | TIMESTAMP | When the user last logged in        |
| settings     | JSONB     | User settings as JSON               |

## Security

The database uses Row Level Security (RLS) with the following policies:

1. Anyone can read user data (for public profiles)
2. Anyone can insert new users (for wallet-based authentication)
3. Anyone can update user data (client-side validation ensures users only update their own data)

Since we're using wallet addresses as authentication, we're relying on client-side validation to ensure users can only update their own data. In a production environment, you might want to implement additional server-side validation or use Supabase Auth with custom claims.

## Usage in the Application

The application uses Zustand for state management with the `useUserStore` hook. When a user connects their Solana wallet, the application automatically:

1. Checks if the user exists in the database
2. Creates a new user record if they don't exist
3. Updates the last login time if they do exist
4. Loads the user data into the application state

The `useUser` hook provides a convenient way to access user data and actions in components.

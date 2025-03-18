# Database Migrations

This directory contains SQL migration scripts for the Supabase database.

## How to Run Migrations

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the migration file you want to run
5. Execute the query

## Available Migrations

### add_openrouter_key_hash.sql

This migration adds the `openrouter_key_hash` column to the `users` table. This column is required for the API key management functionality in the application.

**When to run:** If you're encountering errors like `column users.openrouter_key_hash does not exist` in your application logs.

**What it does:**

- Adds a TEXT column called `openrouter_key_hash` to the `users` table
- Adds a comment to document the column's purpose
- Verifies the column was added successfully

## Migration History

| Date | Migration                   | Description                                        |
| ---- | --------------------------- | -------------------------------------------------- |
| N/A  | add_openrouter_key_hash.sql | Adds the openrouter_key_hash column to users table |

## Best Practices

1. Always back up your database before running migrations
2. Test migrations in a development environment before applying to production
3. Document all migrations in this README
4. Include a verification step in your migrations to confirm they were applied correctly

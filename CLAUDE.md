# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dreams Play is an open-source platform for building, running, and extending Daydreams agents and games. This is a monorepo containing three main components:

- **client/** - React-based web application with AI agents and Gigaverse game integration
- **server/** - Backend API handling authentication, payments (Stripe), and user management (Supabase)
- **proxy/** - Lightweight proxy for routing requests to external APIs (particularly Gigaverse)

## Development Commands

### Client (Port 7575)
```bash
cd client
bun install          # Install dependencies
bun run dev          # Start development server
bun run build        # Build for production
bun run lint         # Run ESLint
bun run preview      # Preview production build
```

### Server
```bash
cd server
bun install          # Install dependencies
bun run dev          # Start development server
bun run start        # Alternative start command
```

### Proxy
```bash
cd proxy
bun install          # Install dependencies
bun run index.ts     # Start proxy server
```

## Architecture & Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **Routing**: TanStack Router with file-based routing
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand stores for global state
- **Path Alias**: `@/` maps to `/client/src/`

### AI & Agent System
- Multiple AI provider integrations: Anthropic, OpenAI, OpenRouter
- Agent framework at `/client/src/agent/` for building AI interactions
- ChromaDB integration for vector storage
- Tavily integration for web search capabilities

### Web3 Integration
- **Solana**: Wallet adapter integration, SPL token support
- **Abstract Chain**: AGW client integration, Gigaverse game on Abstract
- **Wagmi/Viem**: Ethereum-compatible blockchain interactions

### Gigaverse Game
- Onchain RPG built by GLHF on Abstract blockchain
- ROM NFT system (ERC-721) with resource generation mechanics
- Detailed documentation at `/client/src/games/gigaverse/docs/main.md`

### Backend Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT-based with Solana wallet verification
- **Payments**: Stripe integration for credits system
- **Runtime**: Bun (fast JavaScript runtime)

## Important Guidelines

### UI Development (from .cursor/rules/user-interface.mdc)
- Always use Tailwind CSS and shadcn/ui components
- Use Zustand for cross-component state management
- Include custom styling in Tailwind config when possible
- Avoid random comments in code
- Use pnpm for client dependencies (despite bun being used elsewhere)

### Code Organization
- Components should follow existing patterns in the codebase
- Check neighboring files for framework conventions before creating new components
- Use existing utilities and libraries rather than adding new dependencies

### Environment Setup
- Copy and configure `.env` files for each service before running
- Client has `.env.example` and `.env.production` templates
- Environment variables handle API keys and service configurations

## Development Workflow

1. Start all services for full stack development:
   ```bash
   # Terminal 1
   cd server && bun run dev
   
   # Terminal 2
   cd proxy && bun run index.ts
   
   # Terminal 3
   cd client && bun run dev
   ```

2. Access the application at http://localhost:7575

3. The client dev server proxies `/gigaverse-api` requests to https://gigaverse.io

## Testing

Currently, no test framework is configured. Package.json files show "no test specified" for all packages.
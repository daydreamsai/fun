# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dreams Play is an open-source platform for building, running, and extending Daydreams agents and games. This monorepo contains two active components:

- **client/** - React-based web application with AI agents and Gigaverse game integration
- **proxy/** - Lightweight Express proxy for routing requests to external APIs (particularly Gigaverse)

Note: Server component mentioned in main README is not present in current codebase.

## Development Commands

### Client (Port 7575)
```bash
cd client
bun install          # Install dependencies  
bun run dev          # Start development server at localhost:7575
bun run build        # Build for production (outputs to dist/)
bun run lint         # Run ESLint with TypeScript rules
bun run preview      # Preview production build
```

### Proxy (Port 8000)  
```bash
cd proxy
bun install          # Install dependencies
bun run index.js     # Start Express proxy server at localhost:8000
```

### Docker Build
```bash
cd client
./build.sh --release=dev    # Build and push Docker image
```

## Architecture & Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **Routing**: TanStack Router with file-based routing  
- **Styling**: Tailwind CSS with shadcn/ui components  
- **State Management**: Zustand stores for global state
- **Path Alias**: `@/` maps to `/client/src/`

### AI & Agent System
- **Core**: @daydreamsai/core for agent framework
- Multiple AI provider integrations: Anthropic, OpenAI, OpenRouter
- Agent framework at `/client/src/agent/` for building AI interactions
- IndexedDB for local storage via idb library

### Web3 Integration
- **Abstract Chain**: AGW client integration (@abstract-foundation/agw-client, @abstract-foundation/agw-react)
- **Gigaverse Game**: Onchain RPG on Abstract blockchain with combat mechanics
- **Wagmi/Viem**: Ethereum-compatible blockchain interactions (v2.15.2)
- **ROM NFT System**: ERC-721 tokens with tiered resource generation (Silver, Gold, Void, Giga)
- **Game Client**: Custom HTTP client at `/client/src/games/gigaverse/client/GameClient.ts` for all game API interactions

### Gigaverse Game
- Onchain RPG built by GLHF on Abstract blockchain
- ROM NFT system (ERC-721 at 0x59EEC556cEf447E13eDf4BfD3D4433d8daD8a7a5) 
- Resource generation and dungeon combat mechanics
- Detailed documentation at `/client/src/games/gigaverse/docs/main.md`

### Proxy Service
- Express server with http-proxy for request forwarding and path stripping
- Configured route: `/gigaverse/*` → `https://gigaverse.io/api/*` (strips `/gigaverse` prefix)
- Custom `/price` endpoint for token prices via Alchemy API (requires ALCHEMY_API_KEY env var)
- CORS enabled with WebSocket support, timeouts (60s), and enhanced error handling
- Comprehensive logging for all proxy requests and responses

## Important Guidelines from .cursor/rules/user-interface.mdc
- Always use Tailwind CSS and shadcn/ui components
- Use Zustand for cross-component state management  
- Avoid random colors - define a proper theme palette
- Don't add random comments in code
- Follow existing component patterns before creating new ones
- Design philosophy emphasizes simplicity, functionality, and emotional resonance
- Follow Dieter Rams' "Less, but better" principle for component design

## Development Workflow

1. Start required services:
   ```bash
   # Terminal 1 - Proxy (if needed for Gigaverse API)
   cd proxy && bun run index.js
   
   # Terminal 2 - Client
   cd client && bun run dev
   ```

2. Access the application at http://localhost:7575

3. The client dev server proxies `/gigaverse-api` requests to https://gigaverse.io
4. For production deployment, Vercel handles proxy configuration automatically

## Code Conventions

### Component Structure
- React components use function components with TypeScript
- UI components are in `/client/src/components/ui/` (shadcn/ui based)
- Game-specific components in `/client/src/games/[game-name]/components/`
- Use existing UI components from shadcn/ui library before creating new ones

### State Management
- Global state uses Zustand stores in `/client/src/store/` with persistence middleware
- Each store handles a specific domain (user, agent, messages, settings, etc.)
- Stores follow pattern: `use[Domain]Store` naming convention
- Message store uses Map-based storage for context-separated message threads
- Agent state persisted to IndexedDB via custom browserStorage implementation

### File Organization
- Routes in `/client/src/routes/` using TanStack Router file-based routing
- API utilities in `/client/src/utils/`
- Type definitions co-located with their modules
- Game logic isolated in `/client/src/games/` subdirectories

### Testing & Build
- No test framework currently configured
- ESLint configuration in `/client/eslint.config.js` with TypeScript and React rules
- Build artifacts output to `/client/dist/` directory
- Docker containerization available via `/client/build.sh` script

## Environment Variables

### Client
- `VITE_SUPABASE_URL` - Supabase project URL for user management
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- All client env vars must be prefixed with `VITE_` for Vite access

### Proxy  
- `ALCHEMY_API_KEY` - Required for `/price` endpoint token price fetching

## Key Technical Details

### Message System Architecture
- Unified message interface at `/client/src/store/messageStore.ts`
- Supports multiple message types: user, agent, system, action, error, thought
- Real-time streaming with status tracking (pending, streaming, completed, error)
- Context-based message separation for different chat instances
- Persistent storage with Map serialization to localStorage

### Agent Integration
- @daydreamsai/core framework with OpenRouter provider support
- Memory system with in-memory + IndexedDB persistence layers
- Custom cache service for optimized data retrieval
- Agent logs converted to unified message format automatically

### Gigaverse Integration
- Rock-paper-scissors combat system (Sword > Spell > Shield > Sword)
- ROM NFT tiers determine resource generation rates (energy, shards, dust)
- 8 factions: Archon, Athena, Chobo, Crusader, Foxglove, Overseer, Summoner, Gigus
- Dungeon mechanics: 4 rooms × 4 floors, 40 energy entry cost (200 for Gigus dungeon)
# Dreams Play Monorepo

Dreams Play is an open-source platform for building, running, and extending Daydreams agents and games. This monorepo contains three main components:

## Structure

- **client/** – The web client for interacting with Daydreams agents and games. Built with React, TypeScript, and Vite. Includes UI, agent logic, and integrations.
- **proxy/** – A lightweight proxy server for routing and securing requests to Gigaverse APIs and other external services.
- **server/** – The backend server for database actions, authentication, and business logic. Handles user data, credits, and API key management.

---

## Getting Started

1. **Clone the repository:**

   ```sh
   git clone https://github.com/your-org/dreams-play.git
   cd dreams-play
   ```

2. **Install dependencies:**
   Each package is self-contained. Install dependencies in each directory:

   ```sh
   cd client && bun install
   cd ../proxy && bun install
   cd ../server && bun install
   ```

3. **Environment setup:**

   - Copy and configure any required `.env` files for each service.

4. **Run locally:**
   - Start the backend: `cd server && bun run dev`
   - Start the proxy: `cd proxy && bun run index.js`
   - Start the client: `cd client && bun run dev`

---

## Directory Overview

| Directory | Description                                   |
| --------- | --------------------------------------------- |
| `client/` | Web UI for Daydreams agents and games         |
| `proxy/`  | API proxy for Gigaverse and external services |
| `server/` | Database, authentication, and business logic  |

---

## License

Dreams Play is open source under the [MIT License](LICENSE). See the LICENSE file for details.

---

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, features, or improvements.

---

## Release Notes

- Initial open source release
- Modular monorepo: client, proxy, server
- Supabase integration for user management
- Gigaverse proxy and agent support

---

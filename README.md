## Run Locally

**Prerequisites:** Node.js (npm). Wrangler is included as a dev dependency for the local Pages/Workers server.

1. Install dependencies:
   `npm install`
2. Build the app:
   `npm run build`
3. Run the Vite dev server:
   `npm run dev`
4. In another terminal, run the Cloudflare Pages/Workers serverless instance for the Stooq proxy:
   `npx wrangler pages dev . --port 8788`

**Notes:**
- This project uses a Cloudflare Pages + Workers (serverless) instance to host the `/api/proxy/stooq` endpoint.
- The Vite dev server proxies `/api` to `http://localhost:8788` as configured in `vite.config.ts`.

## Architecture Documentation

This project uses two key documentation files as sources of truth for development:

### `.github/copilot-instructions.md`
A comprehensive overview of all coding decisions, patterns, and conventions established throughout the project. This file guides AI assistants and developers on:
- Tech stack and architecture patterns
- Component structure and naming conventions
- Styling system and design tokens
- Common workflows and best practices
- Path aliases and import patterns

Use this file to understand **how** the codebase is structured and **what** conventions to follow when adding new features or modifying existing code.

### `arch.md`
The original architecture and requirements document that defines the project vision, features, and technical specifications. This serves as the foundational source of truth for:
- Product requirements and feature scope
- UI/UX design decisions
- Data models and business logic
- Integration requirements

Refer to this file when implementing new features to ensure alignment with the original project goals and architecture decisions.

**Note for AI Development:** Both files should be consulted before making significant changes or adding new features to maintain consistency with the established architecture and coding patterns.



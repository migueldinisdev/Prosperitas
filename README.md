## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

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



## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Theme System

Prosperitas uses a CSS variable-based theme system with light and dark modes:

- **Theme Toggle**: Available in Settings page
- **Persistence**: Theme preference is saved in localStorage
- **Architecture**: Uses `data-theme` attribute on `<html>` element (NOT Tailwind's `dark:` classes)
- **CSS Variables**: Defined in `index.html` for both light and dark themes
- **Tailwind Tokens**: Semantic color tokens (`bg-app-bg`, `text-app-text-primary`, etc.) reference CSS variables

For development details, see `.github/copilot-instructions.md`

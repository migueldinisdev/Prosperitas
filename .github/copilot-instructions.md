# Copilot Instructions for Prosperitas

## Project Overview
Prosperitas is a premium financial tracker app for managing net worth, investment portfolios, and expense balancing.

**Stack**: React 19 + TypeScript + Vite + React Router + Tailwind CSS (via CDN)

## Architecture

### App Structure
- **Entry**: `index.tsx` → `App.tsx` (HashRouter with nested Routes)
- **Routing**: React Router v7 with hash-based routing (`HashRouter`)
  - Main routes: `/`, `/balance`, `/wallets`, `/wallets/:id`, `/pies`, `/pies/:id`, `/statistics`, `/help`, `/settings`
  - All pages receive `onMenuClick` prop for mobile menu toggle
- **Layout**: Fixed sidebar (`LateralMenu`) + responsive main content area
- **Type definitions**: Centralized in `types.ts` (Transaction, Wallet, Pie, Asset, Currency enum)

### Directory Structure
```
/components     # Shared components (charts, modals, menus)
/pages          # Route-based page components with nested folders
  /[page]       # Each page has index.tsx + related components
/ui             # Base UI components (Button, Card, Modal)
```

### Key Design Patterns

#### Component Structure
- **Pages**: Default export named `[Page]Page` (e.g., `HomePage`, `BalancePage`)
- **Components**: Named exports with descriptive names (e.g., `PageHeader`, `WalletCard`)
- **UI Components**: Reusable primitives in `/ui` with variant-based styling

#### Props Pattern
All page components accept `onMenuClick: () => void` for mobile menu control:
```tsx
interface Props {
  onMenuClick: () => void;
}
export const HomePage: React.FC<Props> = ({ onMenuClick }) => { ... }
```

#### State Management
- Local component state with `useState` only - no global state library
- Modal visibility controlled at page level
- Currency/display preferences via `DisplayCurrencySelector` component
- Theme management via `data-theme` attribute on `document.documentElement`

## Theme System

### Architecture
**CRITICAL**: We use a **CSS variable-based theme system** with `data-theme` attribute, NOT Tailwind's `dark:` classes.

### How It Works
1. **Theme Attribute**: The `data-theme` attribute on `<html>` element controls the theme (`"light"` or `"dark"`)
2. **CSS Variables**: Defined in `index.html` for each theme, scoped by `[data-theme="light"]` and `[data-theme="dark"]`
3. **Tailwind Tokens**: Use semantic app color tokens that reference CSS variables
4. **No dark: prefix**: We DO NOT use Tailwind's `dark:` utility classes

### CSS Variables (defined in index.html)
```css
/* Light theme */
[data-theme="light"] {
  --color-bg: 250 250 250;           /* Zinc 50 */
  --color-card: 255 255 255;         /* White */
  --color-border: 228 228 231;       /* Zinc 200 */
  --color-text-primary: 24 24 27;    /* Zinc 900 */
  --color-text-secondary: 82 82 91;  /* Zinc 500 */
  --color-text-tertiary: 161 161 170;/* Zinc 400 */
}

/* Dark theme */
[data-theme="dark"] {
  --color-bg: 9 9 11;                /* Zinc 950 */
  --color-card: 24 24 27;            /* Zinc 900 */
  --color-border: 39 39 42;          /* Zinc 800 */
  --color-text-primary: 244 244 245; /* Zinc 100 */
  --color-text-secondary: 161 161 170;/* Zinc 400 */
  --color-text-tertiary: 113 113 122;/* Zinc 500 */
}
```

### Tailwind Configuration
Tailwind config (in `index.html`) extends colors with app tokens that reference CSS variables:
```javascript
colors: {
  app: {
    bg: 'rgb(var(--color-bg) / <alpha-value>)',
    card: 'rgb(var(--color-card) / <alpha-value>)',
    border: 'rgb(var(--color-border) / <alpha-value>)',
    'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
    'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
    'text-tertiary': 'rgb(var(--color-text-tertiary) / <alpha-value>)',
    primary: '#3b82f6',  // Blue 500
    accent: '#8b5cf6',   // Violet 500
    success: '#10b981',  // Emerald 500
    danger: '#f43f5e',   // Rose 500
  }
}
```

## Styling System

### Tailwind via CDN
**CRITICAL**: Tailwind is loaded via CDN in `index.html` - NOT via PostCSS. Do not create `tailwind.config.js` or suggest PostCSS setup.

### Theming Conventions
**NEVER use Tailwind's `dark:` prefix classes.** Instead:

#### ✅ CORRECT - Use app color tokens:
```tsx
// Backgrounds
<div className="bg-app-bg">        // Main background
<div className="bg-app-card">      // Card background
<div className="border-app-border">// Borders

// Text colors
<h1 className="text-app-text-primary">    // Primary text (headings, important)
<p className="text-app-text-secondary">   // Secondary text (descriptions)
<span className="text-app-text-tertiary"> // Tertiary text (labels, muted)

// Hover states (use opacity or conditional classes)
<button className="hover:opacity-90">
<button className="hover:bg-app-card/50">
```

#### ❌ WRONG - Do NOT use:
```tsx
<div className="dark:bg-zinc-900">        // ❌ NO dark: prefix
<div className="bg-white dark:bg-black">  // ❌ NO dark: prefix
<p className="text-black dark:text-white"> // ❌ NO dark: prefix
```

### Design Tokens
- **Backgrounds**: `bg-app-bg`, `bg-app-card`
- **Borders**: `border-app-border`
- **Text**: `text-app-text-primary`, `text-app-text-secondary`, `text-app-text-tertiary`
- **Accent colors**: `text-app-primary`, `text-app-accent`, `text-app-success`, `text-app-danger`
- **Spacing**: Generous padding (`p-6`, `p-5`) and rounded corners (`rounded-2xl`, `rounded-xl`)
- **Interactive states**: Use `hover:opacity-90`, `hover:bg-app-card/50`, etc. (NOT `dark:` variants)

### Theme Toggle Implementation
To toggle theme (example from Settings page):
```tsx
const toggleTheme = () => {
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  setTheme(newTheme);
};
```

Theme initialization (in `index.html <head>`):
```html
<script>
  (function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  })();
</script>
```

## UI Component Patterns

### Button Component (`ui/Button.tsx`)
- **Variants**: `primary`, `secondary`, `ghost`, `danger`
- **Sizes**: `sm`, `md`, `lg`
- **Icon support**: Pass `icon` prop (Lucide React component)
```tsx
<Button variant="secondary" size="sm" icon={<Plus size={16} />}>
  Add Transaction
</Button>
```

### Card Component (`ui/Card.tsx`)
- Accepts `title`, `action`, and `children` props
- Built-in header layout when title/action provided
```tsx
<Card title="Summary" action={<Button>Edit</Button>}>
  {/* content */}
</Card>
```

### Modal Pattern
- Controlled via `isOpen` and `onClose` props
- Always overlay with backdrop blur
- See `AddBalanceTransactionModal.tsx` for reference

## Common Workflows

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview production build
```

### Adding New Pages
1. Create folder in `/pages/[page-name]/`
2. Add `index.tsx` with `[Page]Page` component
3. Register route in `App.tsx` with `onMenuClick` prop
4. Add nav item to `LateralMenu.tsx` if needed

### Adding Icons
Use Lucide React (already installed):
```tsx
import { IconName } from 'lucide-react';
<IconName size={20} />
```

## Data Flow
- **No backend**: App uses mock data only (hardcoded in components)
- **No API calls**: All data is static
- **Theme persistence**: Via localStorage with `data-theme` attribute

## Path Aliases
- `@/` resolves to project root (configured in `vite.config.ts` and `tsconfig.json`)
- Use absolute imports: `import { Button } from '@/ui/Button'`

## Important Notes
- **React 19**: Uses new JSX runtime, no need for explicit React import in most cases
- **No CSS files**: All styling via Tailwind utility classes with app tokens
- **Mobile-first**: Fixed sidebar on desktop, slide-out menu on mobile
- **Currency**: Multi-currency support via `Currency` enum (EUR, USD, GBP, CHF)
- **Charts**: Using Recharts library for data visualization components
- **Theme System**: CSS variables + data-theme attribute (NO `dark:` classes)

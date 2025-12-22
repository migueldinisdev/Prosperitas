# Copilot Instructions for Prosperitas

## Project Overview
Prosperitas is a premium financial tracker app for managing net worth, investment portfolios, and expense balancing with a dark/light UI theme system.

**Stack**: React 19 + TypeScript + Vite + React Router + Tailwind CSS (via CDN)

## Architecture

### App Structure
- **Entry**: `index.tsx` → `App.tsx` (HashRouter with nested Routes)
- **Theme**: `ThemeProvider` wraps app, manages light/dark mode
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
/theme          # ThemeProvider context for light/dark mode
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
- Theme state managed via `ThemeProvider` context

## Styling System

### Tailwind via CDN
**CRITICAL**: Tailwind is loaded via CDN in `index.html` - NOT via PostCSS. Do not create `tailwind.config.js` or suggest PostCSS setup.

### Theme System
- **Theme modes**: Light and Dark (toggle via `ThemeToggle` component)
- **Storage**: Persisted in `localStorage` as `prosperitas-theme`
- **Implementation**: Uses `data-theme` attribute on `<html>` element
- **Context**: `ThemeProvider` wraps app, exposes `{ theme, toggleTheme }`
- **Initial load**: Synchronous script in `index.html` prevents FOUC (flash of unstyled content)
- **System preference**: Respects `prefers-color-scheme` as fallback

### Design Tokens
Colors are CSS custom properties (defined in `index.css`) that switch based on `[data-theme="light"]` or `[data-theme="dark"]`:

**Tailwind Configuration** (in `index.html`):
```javascript
colors: {
  app: {
    bg: 'rgb(var(--color-app-bg) / <alpha-value>)',
    card: 'rgb(var(--color-app-card) / <alpha-value>)',
    surface: 'rgb(var(--color-app-surface) / <alpha-value>)',
    border: 'rgb(var(--color-app-border) / <alpha-value>)',
    foreground: 'rgb(var(--color-app-foreground) / <alpha-value>)',
    muted: 'rgb(var(--color-app-muted) / <alpha-value>)',
    primary: 'rgb(var(--color-app-primary) / <alpha-value>)',
    accent: 'rgb(var(--color-app-accent) / <alpha-value>)',
    success: 'rgb(var(--color-app-success) / <alpha-value>)',
    danger: 'rgb(var(--color-app-danger) / <alpha-value>)',
  }
}
```

**Token Reference**:
```
app-bg          // Main background
app-card        // Card backgrounds  
app-surface     // Hover states, elevated surfaces
app-border      // All borders
app-foreground  // Primary text color
app-muted       // Secondary text color
app-primary     // Blue accent (buttons, links)
app-accent      // Violet accent (highlights)
app-success     // Green (positive values)
app-danger      // Red (negative values)
```

**Usage Examples**:
```tsx
// Basic usage
className="bg-app-bg text-app-foreground border-app-border"

// With opacity modifiers (alpha channel support)
className="bg-app-bg/80"           // 80% opacity background
className="border-app-border/50"   // 50% opacity border

// Hover states
className="hover:bg-app-surface hover:text-app-foreground"

// Glass morphism effect
className="bg-app-bg/80 backdrop-blur-md"
```

### Styling Conventions
- **Always use**: Semantic tokens (`app-bg`, `app-card`, `app-foreground`, `app-muted`) - never hardcode colors
- **Spacing**: Generous padding (`p-6`, `p-5`) and rounded corners (`rounded-2xl`, `rounded-xl`)
- **Typography**: Use `text-app-foreground` (main text), `text-app-muted` (secondary text)
- **Interactive states**: `hover:bg-app-surface`, `hover:text-app-foreground`, `transition-colors` or `transition-all duration-200`
- **Cards**: Use `Card` component with built-in styling, not raw divs
- **Theme-aware**: All components automatically adapt to theme changes via CSS custom properties

### Theme Toggle Pattern
```tsx
import { useTheme } from '@/theme/ThemeProvider';

const MyComponent = () => {
  const { theme, toggleTheme } = useTheme();
  // theme is 'light' | 'dark'
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
};
```

## UI Component Patterns

### Button Component (`ui/Button.tsx`)
- **Variants**: `primary` (accent bg), `secondary` (border), `ghost`, `danger`
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
- Uses theme-aware colors automatically
```tsx
<Card title="Summary" action={<Button>Edit</Button>}>
  {/* content */}
</Card>
```

### Modal Pattern
- Controlled via `isOpen` and `onClose` props
- Always overlay with backdrop blur (`bg-app-bg/80 backdrop-blur-md`)
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
- **Persistence**: Only theme preference stored in `localStorage` as `prosperitas-theme`

## Path Aliases
- `@/` resolves to project root (configured in `vite.config.ts` and `tsconfig.json`)
- Use absolute imports: `import { Button } from '@/ui/Button'`

## Important Notes
- **React 19**: Uses new JSX runtime, no need for explicit React import in most cases
- **No CSS files**: All styling via Tailwind utility classes + CSS custom properties for theming
- **Mobile-first**: Fixed sidebar on desktop, slide-out menu on mobile
- **Currency**: Multi-currency support via `Currency` enum (EUR, USD, GBP, CHF)
- **Charts**: Using Recharts library for data visualization components
- **Theme persistence**: Automatically saves user preference and respects system theme

# Copilot Instructions for Prosperitas

## Project Overview
Prosperitas is a premium financial tracker app for managing net worth, investment portfolios, and expense balancing with a dark UI aesthetic.

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

## Styling System

### Tailwind via CDN
**CRITICAL**: Tailwind is loaded via CDN in `index.html` - NOT via PostCSS. Do not create `tailwind.config.js` or suggest PostCSS setup.

### Design Tokens (defined in `index.html`)
```javascript
colors: {
  app: {
    bg: '#09090b',      // Zinc 950 - main background
    card: '#18181b',    // Zinc 900 - card backgrounds
    border: '#27272a',  // Zinc 800 - borders
    primary: '#3b82f6', // Blue 500
    accent: '#8b5cf6',  // Violet 500
    success: '#10b981', // Emerald 500
    danger: '#f43f5e',  // Rose 500
  }
}
```

### Styling Conventions
- **Always use**: `bg-app-bg`, `bg-app-card`, `border-app-border` for backgrounds/borders
- **Spacing**: Generous padding (`p-6`, `p-5`) and rounded corners (`rounded-2xl`, `rounded-xl`)
- **Typography**: `text-zinc-100` (main), `text-zinc-400` (secondary), `text-zinc-500` (tertiary)
- **Interactive states**: `hover:bg-zinc-800`, `transition-all duration-200`
- **Cards**: Use `Card` component with built-in styling, not raw divs

## UI Component Patterns

### Button Component (`ui/Button.tsx`)
- **Variants**: `primary` (white bg), `secondary` (border), `ghost`, `danger`
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
- **No persistence**: No localStorage/sessionStorage currently implemented

## Path Aliases
- `@/` resolves to project root (configured in `vite.config.ts` and `tsconfig.json`)
- Use absolute imports: `import { Button } from '@/ui/Button'`

## Important Notes
- **React 19**: Uses new JSX runtime, no need for explicit React import in most cases
- **No CSS files**: All styling via Tailwind utility classes
- **Mobile-first**: Fixed sidebar on desktop, slide-out menu on mobile
- **Currency**: Multi-currency support via `Currency` enum (EUR, USD, GBP, CHF)
- **Charts**: Using Recharts library for data visualization components

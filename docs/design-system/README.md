# Teachmo Design System & Brand Governance

## 1. Core "Vibe" Principles
*Derived from Teachmo Vibe Coding Principles [cite: 64, 65]*
* **Warm, Funny, Real:** We are never clinical or judgmental. We speak like a supportive friend.
* **Micro-Wins:** Every screen should offer a "doable now" action.
* **Tiny Scripts:** Use "Words to try" patterns in UI copy rather than abstract instructions.

## 2. Shared "Shell" Architecture
*Consistent behavior across Parent and Partner portals*
All portals use the `<AppShell>` component which enforces:
* **Mobile Responsiveness:** Hamburger menus and touch targets (min 44px) behave identically.
* **Navigation Structure:** Sidebar (desktop) / Drawer (mobile) hierarchy is consistent.
* **Accessibility:** Focus traps, skip-links, and ARIA labels are baked in.

## 3. Theming & Portals
While the structure is shared, the **Visual Theme** differs by role.

### A. Parent Portal (B2C) - "The Warm Companion"
* **Primary Color:** `Teachmo Blue` (#2451FF) [cite: 8]
* **Secondary:** `Sunrise Gold` (#FFC857) & `Coral` (#FF6B6B) [cite: 8]
* **Background:** `Off-white` (#FAFAFA) [cite: 13]
* **Typography:** Headings: *Poppins* (Friendly/Bold); Body: *Inter* [cite: 9, 13]
* **Vibe:** High whitespace, playful rounded corners, "card" based layout.

### B. Partner Portal (B2B) - "The Professional Workspace"
* **Primary Color:** `Deep Teal` or `Slate` (#2F3437) (Distinct from Parent Blue) [cite: 13]
* **Secondary:** `Leaf Green` (#2DBF6E) (Signaling growth/approval) [cite: 8]
* **Typography:** Headings: *Inter* (Clean/Professional); Body: *Inter*.
* **Vibe:** Higher information density (tables/dashboards), distinct "Professional" headers.

## 4. Token Reference (Tailwind)
Do not use hex codes directly. Use semantic tokens:
* `bg-background` (Changes based on active portal theme)
* `text-primary`
* `border-muted`

## 5. Implementation: Theming the Partner Portal
To achieve the "Distinct Identity" you requested without rewriting the layout code, we will use CSS variables scoped to a specific parent class (`.theme-partner`).

### Step A: Configure Tailwind for Theming
Update your config to use CSS variables for colors. This allows the Partner Portal to swap "Primary" from Blue to Slate instantly.

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Semantic names mapped to CSS variables
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-background)',

        // Brand primitives (for reference) [cite: 8, 13]
        brand: {
          blue: '#2451FF',
          gold: '#FFC857',
          green: '#2DBF6E',
          coral: '#FF6B6B',
          slate: '#2F3437',
          offwhite: '#FAFAFA',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Body [cite: 9]
        heading: ['Poppins', 'sans-serif'], // Headings [cite: 9]
        mono: ['JetBrains Mono', 'monospace'], // Internal/Code [cite: 9]
      }
    }
  }
}
```

### Step B: Define Themes in Global CSS
We define the root (Parent) defaults and a special `.theme-partner` class that overrides them.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Default Theme (Parent Portal) - Warm & Playful  */
  :root {
    --color-primary: #2451FF; /* Teachmo Blue */
    --color-secondary: #FFC857; /* Sunrise Gold */
    --color-background: #FAFAFA; /* Off-white */
    --radius-card: 1rem; /* Playful rounded corners */
  }

  /* Partner Portal Theme - Professional & Distinct [cite: 21] */
  .theme-partner {
    --color-primary: #2F3437; /* Slate - distinctly B2B */
    --color-secondary: #2DBF6E; /* Leaf Green */
    --color-background: #FFFFFF; /* Pure white for data density */
    --radius-card: 0.5rem; /* Tighter, professional corners */
  }
}
```

### Step C: Apply Theme in the Router
In your App.jsx or Layout wrapper, wrap the Partner routes with the theme class.

```jsx
// src/components/layout/PartnerLayout.jsx
import { AppShell } from './AppShell';

export const PartnerLayout = ({ children }) => {
  return (
    // This class switches all colors to the Partner palette automatically
    <div className="theme-partner font-sans">
      <AppShell userRole="partner" navItems={partnerNavItems}>
        {children}
      </AppShell>
    </div>
  );
};
```

## 6. Integrating "Teachmo Vibe" into Components
The "Notebook LM" files emphasize specific interaction patterns. Here is how to codify them into your Design System components:

### The "Words to Try" Component
The "Tiny scripts" and "Words to try" are core to the brand. Create a standardized component for this so developers don't just use a generic text block.

```jsx
// src/components/shared/WordsToTry.jsx
export const WordsToTry = ({ script }) => (
  <div className="bg-brand-offwhite border-l-4 border-brand-gold p-4 my-4 rounded-r-lg">
    <p className="text-sm font-bold text-brand-slate uppercase tracking-wide mb-1">
      Words to Try
    </p>
    <p className="text-lg font-heading text-brand-blue italic">
      "{script}"
    </p>
  </div>
);
```

### Micro-Wins (Gamification)
The Partner Portal has an optional gamified "Partner Level" badge system. Ensure the visuals for these badges differ from the Parent badges (e.g., use hexagonal shapes for Partners vs. circular for Parents) to reinforce the distinct environment.

## 7. Summary of Changes for your Team
**Designers:** Create two Figma modes: "Parent (Warm)" using Poppins/Blue/Gold and "Partner (Pro)" using Inter/Slate/Green.

**Developers:** Implement the CSS variables in index.css immediately. Wrap `src/pages/partner/*` routes in the `.theme-partner` class.

**Content:** Ensure all error messages and empty states in the Parent portal follow the "Never judgy" rule (e.g., avoid "You failed," use "Let's try again").

# LiveDoc Design Tokens

Complete reference for all design tokens used in the LiveDoc project.

---

## Colors

### Primary Colors
| Name | Tailwind | Hex | Usage |
|------|----------|-----|-------|
| Blue 500 | `blue-500` | `#3b82f6` | Primary actions, links |
| Blue 600 | `blue-600` | `#2563eb` | Primary button gradient |
| Blue 700 | `blue-700` | `#1d4ed8` | Primary hover state |
| Indigo 600 | `indigo-600` | `#4f46e5` | Gradient middle |
| Indigo 700 | `indigo-700` | `#4338ca` | Gradient hover |
| Purple 600 | `purple-600` | `#9333ea` | Gradient end |
| Purple 700 | `purple-700` | `#7e22ce` | Gradient hover |

### Semantic Colors
| Name | Tailwind | Hex | Usage |
|------|----------|-----|-------|
| Green 500 | `green-500` | `#22c55e` | Success, online status |
| Green 600 | `green-600` | `#16a34a` | Success text |
| Yellow 400 | `yellow-400` | `#fbbf24` | Warning |
| Yellow 500 | `yellow-500` | `#eab308` | Connecting status |
| Red 500 | `red-500` | `#ef4444` | Error, destructive |
| Red 600 | `red-600` | `#dc2626` | Destructive hover |

### Gray Scale
| Name | Tailwind | Hex | Usage |
|------|----------|-----|-------|
| Gray 50 | `gray-50` | `#f9fafb` | Page background |
| Gray 100 | `gray-100` | `#f3f4f6` | Hover bg, scrollbar track |
| Gray 200 | `gray-200` | `#e5e7eb` | Borders, dividers |
| Gray 300 | `gray-300` | `#d1d5db` | Scrollbar thumb |
| Gray 400 | `gray-400` | `#9ca3af` | Muted icons, labels |
| Gray 500 | `gray-500` | `#6b7280` | Secondary text |
| Gray 600 | `gray-600` | `#4b5563` | Muted headings |
| Gray 700 | `gray-700` | `#374151` | Body text |
| Gray 800 | `gray-800` | `#1f2937` | Code blocks bg |
| Gray 900 | `gray-900` | `#111827` | Primary headings |

### Avatar Color Palette
```typescript
const AVATAR_COLORS = [
  '#ef4444', // Red 500
  '#3b82f6', // Blue 500
  '#22c55e', // Green 500
  '#a855f7', // Purple 500
  '#f59e0b', // Amber 500
  '#06b6d4'  // Cyan 500
]
```

### Cursor Color (CSS Variable)
```css
:root {
  --cursor-color: #3b82f6;
}
```

---

## Typography

### Font Family
```css
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

**Tailwind:** `font-mono`

### Text Sizes
| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Badges, timestamps |
| `text-sm` | 14px | 20px | Secondary text, captions |
| `text-base` | 16px | 24px | Body text (default) |
| `text-lg` | 18px | 28px | Subheadings |
| `text-xl` | 20px | 28px | Section headers |
| `text-2xl` | 24px | 32px | Page title (mobile) |
| `text-3xl` | 30px | 36px | Page title (desktop) |

### Font Weights
| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, subtle emphasis |
| `font-semibold` | 600 | Headings, buttons |
| `font-bold` | 700 | Primary headings |

---

## Spacing

### Base Unit
**4px** (Tailwind default)

### Padding Scale
| Class | Value | Common Usage |
|-------|-------|--------------|
| `p-0.5` | 2px | Pill container |
| `p-1` | 4px | Minimal |
| `p-1.5` | 6px | Badge padding |
| `p-2` | 8px | Icon buttons |
| `p-2.5` | 10px | Small buttons |
| `p-3` | 12px | Card padding |
| `p-3.5` | 14px | Primary buttons |
| `p-4` | 16px | Section padding |
| `p-5` | 20px | Container padding |
| `p-6` | 24px | Page padding (desktop) |
| `p-8` | 32px | Large sections |

### Gap Scale
| Class | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight grouping |
| `gap-1.5` | 6px | Icon + text |
| `gap-2` | 8px | Inline elements |
| `gap-3` | 12px | Card content |
| `gap-4` | 16px | Section items |
| `gap-6` | 24px | Major sections |

### Margin Patterns
| Pattern | Usage |
|---------|-------|
| `mb-2` | Between label and input |
| `mb-4` | Between sections |
| `mb-6` | Section groups |
| `mb-8` | Major page sections |
| `-space-x-2` | Avatar stacking overlap |

---

## Border Radius

| Class | Value | Usage |
|-------|-------|-------|
| `rounded` | 4px | Small badges |
| `rounded-md` | 6px | Segmented buttons |
| `rounded-lg` | 8px | Buttons, inputs |
| `rounded-xl` | 12px | Cards, alerts |
| `rounded-2xl` | 16px | Large cards, logo |
| `rounded-full` | 50% | Avatars, circular |

---

## Shadows

| Class | Usage |
|-------|-------|
| `shadow-sm` | Subtle card elevation |
| `shadow-md` | Card hover state |
| `shadow-lg` | Floating elements |
| `shadow-xl` | Panels, modals |
| `shadow-blue-500/25` | Primary button glow |
| `shadow-blue-500/30` | Primary button hover glow |

---

## Borders

| Pattern | Usage |
|---------|-------|
| `border border-gray-100` | Default card border |
| `border border-gray-200` | Dividers, panels |
| `border border-blue-100` | Highlighted card |
| `border-b border-gray-100` | Subtle divider |
| `border-2 border-white` | Avatar stack border |
| `ring-2 ring-blue-400` | Focus ring, current user |
| `ring-offset-1` | Ring spacing |

---

## Breakpoints

| Name | Size | Usage |
|------|------|-------|
| `xs` | 375px | Small mobile |
| `sm` | 640px | Large mobile (Tailwind default) |
| `md` | 768px | Tablet/desktop |
| `lg` | 1024px | Desktop (if needed) |

### Custom Breakpoint
```javascript
// tailwind.config.js
theme: {
  extend: {
    screens: {
      'xs': '375px',
    },
  },
},
```

---

## Z-Index Scale

| Value | Usage |
|-------|-------|
| `z-10` | Cursors, floating elements |
| `z-40` | Backdrop overlay |
| `z-50` | Modals, panels |

---

## Transitions

### Duration
| Class | Value |
|-------|-------|
| (default) | 150ms |
| `duration-200` | 200ms |
| `duration-300` | 300ms |

### Common Patterns
```
transition-colors      // Color changes
transition-all         // Multiple properties
transition-opacity     // Fade effects
```

---

## Animations

### Slide In (Desktop)
```css
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slide-in {
  animation: slideIn 0.2s ease-out;
}
```

### Slide Up (Mobile)
```css
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
```

### Bottom Sheet
```css
@keyframes bottomSheet {
  from {
    transform: translateY(100%);
    opacity: 0.5;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.animate-bottom-sheet {
  animation: bottomSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
```

### Built-in Tailwind
- `animate-pulse` - Pulsing indicator
- `animate-spin` - Loading spinner

---

## Mobile Utilities

### Touch Target
```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

### Safe Areas
```css
.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

### Mobile Viewport Height
```css
.h-screen-mobile {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport for mobile */
}
```

### Momentum Scrolling
```css
.scroll-touch {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

### Prevent Selection
```css
.no-select {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
```

### iOS Input Zoom Prevention
```css
@media screen and (max-width: 767px) {
  input, textarea, select {
    font-size: 16px !important;
  }
}
```

---

## Gradient Patterns

### Primary Button Gradient
```
bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700
```

### Logo/Brand Gradient
```
bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600
```

### Text Gradient
```
bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent
```

### Subtle Background Gradient
```
bg-gradient-to-br from-blue-50 to-indigo-50
```

### Page Background
```
bg-gradient-to-b from-gray-50 to-gray-100
```

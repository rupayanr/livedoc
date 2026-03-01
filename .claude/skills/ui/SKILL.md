---
name: ui
description: "Use this skill when the user asks to create UI components, review UI code, check design consistency, or audit mobile responsiveness. Invoke for any frontend/styling task."
version: 1.0.0
allowed-tools: [Read, Glob, Grep, Edit, Write]
---

# LiveDoc UI Design Skill

You are a UI design assistant for the LiveDoc project. Use this skill to generate components, review UI code, enforce design consistency, and audit mobile responsiveness.

## Capabilities

### 1. Generate UI Components
Create React + Tailwind components following LiveDoc patterns.

### 2. Review UI Code
Analyze components for spacing, colors, accessibility, and design consistency.

### 3. Apply Design System
Ensure consistency with defined tokens (colors, typography, spacing).

### 4. Mobile-First Audit
Check touch targets (44px min), safe areas, and responsive breakpoints.

---

## Design System Reference

### Colors

**Primary Palette:**
- Blue: `#3b82f6` (blue-500) - Primary actions
- Indigo: `#4f46e5` (indigo-600) - Accent
- Purple: `#9333ea` (purple-600) - Accent

**Semantic Colors:**
- Success: `#22c55e` (green-500)
- Warning: `#fbbf24` (yellow-400)
- Error: `#ef4444` (red-500)

**Gray Scale:**
- `gray-50` (#f9fafb) - Background
- `gray-100` (#f3f4f6) - Hover states, borders
- `gray-200` (#e5e7eb) - Borders
- `gray-400` (#9ca3af) - Muted text
- `gray-500` (#6b7280) - Secondary text
- `gray-700` (#374151) - Body text
- `gray-900` (#111827) - Headings

**Avatar Colors:**
```typescript
const AVATAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4']
```

### Typography

**Font Family:**
```css
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```
Use: `font-mono` in Tailwind

**Text Scale:**
- `text-xs` (12px) - Badges, labels
- `text-sm` (14px) - Secondary text, captions
- `text-base` (16px) - Body text
- `text-lg` (18px) - Subheadings
- `text-xl` (20px) - Section headers
- `text-2xl` (24px) - Page titles (mobile)
- `text-3xl` (30px) - Page titles (desktop)

**Font Weights:**
- `font-normal` (400) - Body text
- `font-medium` (500) - Labels, buttons
- `font-semibold` (600) - Headings, emphasis
- `font-bold` (700) - Primary headings

### Spacing

**Base Unit:** 4px (Tailwind default)

**Common Patterns:**
- `p-2` (8px) - Compact elements
- `p-3` (12px) - Small cards, buttons
- `p-4` (16px) - Standard cards, sections
- `p-5` / `p-6` (20-24px) - Page containers
- `p-8` (32px) - Large sections

**Gaps:**
- `gap-1.5` - Icon spacing
- `gap-2` - Inline elements
- `gap-3` - Card content
- `gap-4` - Section spacing
- `gap-6` - Major sections

### Border Radius

- `rounded` (4px) - Small elements (badges)
- `rounded-lg` (8px) - Buttons, inputs
- `rounded-xl` (12px) - Cards, panels
- `rounded-2xl` (16px) - Large cards, containers
- `rounded-full` - Avatars, circular buttons

### Shadows

- `shadow-sm` - Subtle elevation
- `shadow-md` - Cards on hover
- `shadow-lg` - Floating panels
- `shadow-xl` - Modals
- `shadow-blue-500/25` - Colored shadows for primary buttons

### Touch Targets

**Minimum size:** 44x44px
```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

Use `touch-target` class on all interactive elements on mobile.

### Safe Areas

**CSS Variables:**
```css
--safe-area-inset-top: env(safe-area-inset-top, 0px);
--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
```

**Utility Classes:**
- `safe-area-top` - Apply to top fixed elements
- `safe-area-bottom` - Apply to bottom fixed elements

### Breakpoints

- `xs`: 375px (small mobile)
- `md`: 768px (tablet/desktop)

**Mobile-first pattern:**
```tsx
// Mobile styles by default, override for desktop
className="p-3 md:p-4 text-base md:text-lg"
```

### Animations

**Available animations:**
- `animate-slide-in` - Desktop panel slide from right
- `animate-slide-up` - Mobile panel slide from bottom
- `animate-bottom-sheet` - iOS-style bottom sheet
- `animate-pulse` - Pulsing indicator
- `animate-spin` - Loading spinner

**Reduced motion support:**
```css
@media (prefers-reduced-motion: reduce) {
  .animate-* { animation: none; }
}
```

---

## Component Patterns

### Primary Button (Gradient)
```tsx
<button className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 touch-target flex items-center justify-center gap-2">
  <Icon className="w-5 h-5" />
  Button Text
</button>
```

### Secondary Button
```tsx
<button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
  Cancel
</button>
```

### Icon Button
```tsx
<button className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-target flex items-center justify-center">
  <svg className="w-5 h-5 text-gray-500" />
</button>
```

### Destructive Button
```tsx
<button className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
  Delete
</button>
```

### Card
```tsx
<div className="p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all group active:scale-[0.98]">
  {/* Content */}
</div>
```

### Panel (Sliding)
```tsx
{/* Desktop: slide from right, Mobile: slide from bottom */}
<div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-full md:w-80 bg-white shadow-xl z-50 flex flex-col animate-slide-up md:animate-slide-in safe-area-top safe-area-bottom">
  {/* Header */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
    <h2 className="font-semibold text-gray-900">Title</h2>
    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-target">
      <CloseIcon />
    </button>
  </div>
  {/* Content */}
  <div className="flex-1 overflow-y-auto p-4 scroll-touch">
    {/* ... */}
  </div>
</div>
```

### Input Field
```tsx
<input
  type="text"
  className="text-base font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
/>
```

### Connection Status Indicator
```tsx
<div className="flex items-center gap-2">
  <div className={`w-2 h-2 rounded-full ${
    connected ? 'bg-green-500'
    : connecting ? 'bg-yellow-500 animate-pulse'
    : 'bg-red-500'
  }`} />
  <span className="text-sm text-gray-500">{statusText}</span>
</div>
```

### User Avatar with Ring
```tsx
<div className="ring-2 ring-blue-400 ring-offset-2 rounded-full">
  <Avatar size={40} name={userName} variant="beam" colors={AVATAR_COLORS} />
</div>
```

### Empty State
```tsx
<div className="text-center py-16 px-6">
  <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
    <svg className="h-10 w-10 text-blue-400" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
  <p className="text-gray-500">Description text here</p>
</div>
```

### Loading Spinner
```tsx
<div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
```

### Error Banner
```tsx
<div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
  Error message here
</div>
```

### Mobile View Toggle (Segmented Control)
```tsx
<div className="flex md:hidden bg-gray-100 rounded-lg p-0.5">
  <button className={`p-2 rounded-md transition-colors touch-target ${
    active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
  }`}>
    Option 1
  </button>
  <button className={/* same pattern */}>
    Option 2
  </button>
</div>
```

---

## Review Checklist

When reviewing UI code, check for:

### Spacing & Layout
- [ ] Consistent padding (`p-3`, `p-4`)
- [ ] Proper gaps between elements
- [ ] Mobile-first responsive classes
- [ ] Safe area padding on fixed elements

### Colors
- [ ] Using design system colors (not arbitrary hex)
- [ ] Proper contrast ratios
- [ ] Semantic color usage (green=success, red=error)
- [ ] Consistent gray scale usage

### Typography
- [ ] Using `font-mono` for code/editor content
- [ ] Appropriate text sizes per context
- [ ] Proper font weights for hierarchy

### Interactive Elements
- [ ] Touch targets >= 44px on mobile
- [ ] Hover states defined
- [ ] Active/pressed states (`active:scale-[0.98]`)
- [ ] Focus states for accessibility

### Animations
- [ ] Using defined animation classes
- [ ] Respects `prefers-reduced-motion`
- [ ] Appropriate duration and easing

### Accessibility
- [ ] `title` attributes on icon-only buttons
- [ ] Sufficient color contrast
- [ ] Keyboard navigable elements
- [ ] Semantic HTML structure

---

## Mobile Audit Checklist

When auditing for mobile responsiveness:

### Touch Targets
- [ ] All buttons/links have `touch-target` class or min 44x44px
- [ ] Adequate spacing between tappable elements
- [ ] No elements require precision tapping

### Safe Areas
- [ ] Fixed headers use `safe-area-top`
- [ ] Fixed footers use `safe-area-bottom`
- [ ] Content doesn't hide under notch/home indicator

### Viewport
- [ ] Using `h-screen-mobile` for full-height views
- [ ] Inputs have `font-size: 16px` to prevent iOS zoom
- [ ] `scroll-touch` on scrollable containers

### Responsive Design
- [ ] Mobile-first class ordering
- [ ] Hidden desktop elements use `md:hidden`
- [ ] Appropriate breakpoint usage (`xs:`, `md:`)

### Animations
- [ ] Mobile-specific animations (`animate-slide-up`)
- [ ] Bottom sheet pattern for mobile panels
- [ ] Reduced motion fallbacks

---

## Usage Examples

### Generate a Component
"Create a notification badge component"
- Generate React + TypeScript code
- Use design system tokens
- Include mobile responsiveness
- Add proper accessibility

### Review Existing Code
"Review the Toolbar.tsx for design consistency"
- Read the file
- Check against design system
- Identify inconsistencies
- Suggest fixes with code samples

### Mobile Audit
"Audit UserPanel.tsx for mobile responsiveness"
- Check touch targets
- Verify safe areas
- Test responsive breakpoints
- Review animations

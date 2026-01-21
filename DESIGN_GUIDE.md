# EFSMovie Design System Guide

A comprehensive design methodology guide for maintaining visual consistency across the application. Use this document when building new features or working in other Claude Code sessions.

**CRITICAL: This guide defines a premium, spacious design language. Do NOT default to compact, cramped, or purely functional layouts. Every page should feel polished and breathable.**

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Layout Architecture](#layout-architecture) ⭐ **READ THIS FIRST**
3. [Visual Hierarchy & Whitespace](#visual-hierarchy--whitespace) ⭐ **CRITICAL**
4. [Anti-Patterns](#anti-patterns) ⭐ **WHAT NOT TO DO**
5. [UX Principles](#ux-principles)
6. [Technology Stack](#technology-stack)
7. [Color System](#color-system)
8. [Typography](#typography)
9. [Spacing & Layout](#spacing--layout)
10. [Responsive Design](#responsive-design)
11. [Component Patterns](#component-patterns)
12. [Dashboard & Stats Patterns](#dashboard--stats-patterns)
13. [Icons](#icons)
14. [Forms & Inputs](#forms--inputs)
15. [Buttons](#buttons)
16. [Cards & Containers](#cards--containers)
17. [Animations & Transitions](#animations--transitions)
18. [Code Examples](#code-examples)

---

## Core Philosophy

### Design Principles

1. **Utility-First**: Use Tailwind CSS utilities directly. Only extract to components when a pattern repeats 3+ times.
2. **Mobile-First**: Base styles target mobile; use breakpoint prefixes (`sm:`, `md:`, `lg:`) for larger screens.
3. **Consistency Over Creativity**: Reuse existing patterns. When in doubt, check similar existing components.
4. **Subtle Depth**: Use light shadows (`shadow-sm`) and borders for hierarchy, not heavy shadows.
5. **Purple & Gold Identity**: Primary actions are purple; secondary/accent elements use gold.

### No Dark Mode

This application is light-mode only. Do not add dark mode variants.

---

## Layout Architecture

**⚠️ CRITICAL SECTION - Read this before building any page**

This design system prioritizes **spacious, centered, premium-feeling layouts**. The goal is to make users feel like they're using a polished product, not a developer's quick prototype.

### The Golden Rules

1. **NEVER left-justify everything** - Content should be centered or have intentional asymmetry
2. **ALWAYS use max-width constraints** - Content should not stretch to fill the entire viewport
3. **GENEROUS padding everywhere** - When in doubt, add more padding
4. **Cards should breathe** - Internal padding of p-6 minimum, often p-8
5. **Grid gaps matter** - Use gap-6 or gap-8, not gap-2 or gap-4 for card grids

### Page Layout Structure

Every page should follow this structure:

```tsx
// CORRECT: Centered content with max-width constraints
<div className="p-6 sm:p-8 lg:p-10">
  <div className="max-w-7xl mx-auto">
    {/* Page header */}
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Page Title</h1>
      <p className="text-gray-600 mt-2">Optional description with breathing room</p>
    </div>

    {/* Content with generous spacing */}
    <div className="space-y-8">
      {/* Sections go here */}
    </div>
  </div>
</div>

// WRONG: Left-aligned, cramped, no constraints
<div className="p-4">
  <h1>Page Title</h1>
  <div className="space-y-2">
    {/* Cramped content */}
  </div>
</div>
```

### Content Width Guidelines

| Content Type | Max Width | Class |
|-------------|-----------|-------|
| Full page content | 1280px | `max-w-7xl mx-auto` |
| Reading content/forms | 672px | `max-w-2xl mx-auto` |
| Narrow forms/modals | 448px | `max-w-md mx-auto` |
| Wide dashboards | 1536px | `max-w-screen-2xl mx-auto` |

### Main Content Area (with sidebar)

```tsx
<main className="lg:ml-64 min-h-screen bg-gray-50">
  <div className="p-6 sm:p-8 lg:p-10 pt-20 lg:pt-10">
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </div>
</main>
```

### Section Spacing

```tsx
// Between major sections: mb-10 or mb-12
<section className="mb-10">
  <h2 className="text-xl font-semibold mb-6">Section Title</h2>
  {/* content */}
</section>

// Between related items: mb-6 or mb-8
<div className="mb-8">
  {/* related content group */}
</div>
```

---

## Visual Hierarchy & Whitespace

**The #1 mistake is not using enough whitespace.** Premium applications feel spacious. Cramped layouts feel like internal tools or MVPs.

### Whitespace Philosophy

1. **Whitespace is not wasted space** - It creates focus, improves readability, and signals quality
2. **Double your first instinct** - If you think p-4 is enough, try p-6 or p-8
3. **Let important elements breathe** - Hero sections, CTAs, and key stats need extra space
4. **Create visual rhythm** - Consistent spacing creates a professional feel

### Minimum Spacing Rules

| Context | Minimum Padding | Recommended |
|---------|-----------------|-------------|
| Page outer padding | p-4 | p-6 sm:p-8 lg:p-10 |
| Card internal padding | p-4 | p-6 |
| Stat card padding | p-4 | p-6 |
| Form sections | p-4 | p-6 |
| Between cards | gap-4 | gap-6 |
| Section margins | mb-6 | mb-8 or mb-10 |
| Header to content | mb-4 | mb-6 or mb-8 |

### Creating Visual Hierarchy

```tsx
// Level 1: Page Header (largest, most prominent)
<div className="mb-10">
  <h1 className="text-3xl font-bold text-gray-900 mb-3">Dashboard</h1>
  <p className="text-lg text-gray-600">Welcome back, here's your overview</p>
</div>

// Level 2: Section Headers
<div className="mb-6">
  <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
</div>

// Level 3: Card Headers
<div className="mb-4">
  <h3 className="text-lg font-medium text-gray-900">Card Title</h3>
</div>

// Level 4: Labels and metadata
<span className="text-sm text-gray-500">Last updated 2 hours ago</span>
```

### The Breathing Room Test

Before shipping any page, ask:
- Does the content feel cramped?
- Is there clear visual separation between sections?
- Do the cards have enough internal padding?
- Is there enough space between the header and first content block?
- Would a user feel like this is a premium product?

---

## Anti-Patterns

**⛔ These patterns are FORBIDDEN in this design system**

### Layout Anti-Patterns

```tsx
// ❌ WRONG: No max-width, content stretches across entire screen
<div className="p-4">
  <div className="grid grid-cols-4 gap-2">

// ✅ CORRECT: Constrained width, centered, generous spacing
<div className="p-6 sm:p-8">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```

```tsx
// ❌ WRONG: Minimal padding, cramped cards
<div className="card p-2">
  <span className="text-sm">Small Card</span>
</div>

// ✅ CORRECT: Generous padding, proper hierarchy
<div className="card p-6">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-gray-600">Card content with room to breathe</p>
</div>
```

```tsx
// ❌ WRONG: Left-aligned stats in a row with no visual appeal
<div className="flex gap-2">
  <div>Stat: 5</div>
  <div>Stat: 10</div>
</div>

// ✅ CORRECT: Centered grid with visual cards
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <div className="card p-6 text-center">
    <p className="text-sm text-gray-500 mb-1">Stat Label</p>
    <p className="text-3xl font-bold text-purple-600">5</p>
  </div>
</div>
```

### Typography Anti-Patterns

```tsx
// ❌ WRONG: No hierarchy, everything same size
<div>
  <span>Title</span>
  <span>Description</span>
  <span>Metadata</span>
</div>

// ✅ CORRECT: Clear visual hierarchy
<div>
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
  <p className="text-gray-600 mt-2">Description with secondary styling</p>
  <span className="text-sm text-gray-500 mt-1">Metadata in smallest size</span>
</div>
```

### Spacing Anti-Patterns

```tsx
// ❌ WRONG: Tight spacing, feels cramped
<div className="space-y-1">
<div className="gap-2">
<div className="p-2">
<div className="mb-2">

// ✅ CORRECT: Generous spacing, feels premium
<div className="space-y-4"> or space-y-6
<div className="gap-4"> or gap-6
<div className="p-4"> or p-6
<div className="mb-6"> or mb-8
```

### Component Anti-Patterns

```tsx
// ❌ WRONG: Plain, unstyled stats
<span>10</span>

// ✅ CORRECT: Styled stat with context
<div className="text-center">
  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total</p>
  <p className="text-3xl font-bold text-gray-900 mt-1">10</p>
</div>
```

### Things to NEVER Do

1. **NEVER** use gap-1 or gap-2 for card grids
2. **NEVER** use p-2 for card padding (minimum p-4, prefer p-6)
3. **NEVER** skip max-width constraints on page content
4. **NEVER** left-align everything without intentional design
5. **NEVER** use raw numbers without visual context (labels, units, icons)
6. **NEVER** stack elements with space-y-1 or space-y-2
7. **NEVER** make stat cards smaller than 120px wide
8. **NEVER** forget responsive sizing (always include sm:, md:, lg: variants)

---

## UX Principles

### User Experience Guidelines

1. **Clarity over density** - Users shouldn't have to squint or parse cramped information
2. **Scannability** - Key information should be immediately visible
3. **Visual affordances** - Interactive elements should look interactive
4. **Consistent patterns** - Similar actions should look and work similarly
5. **Feedback** - Users should always know what's happening

### Dashboard UX Patterns

```tsx
// Top-level stats should be immediately visible and impressive
<div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
  <StatCard
    label="Total Items"
    value={42}
    icon={Box}
    trend="+12%"
  />
  {/* ... more stat cards */}
</div>

// Recent activity should show context and be scannable
<div className="card">
  <div className="px-6 py-4 border-b border-gray-100">
    <h2 className="text-lg font-semibold">Recent Activity</h2>
  </div>
  <div className="divide-y divide-gray-100">
    {items.map(item => (
      <div key={item.id} className="px-6 py-4 flex items-center justify-between">
        {/* Item with icon, title, description, and timestamp */}
      </div>
    ))}
  </div>
</div>
```

### Empty States

Empty states should never be just text. They should:
- Have a relevant icon (h-12 w-12 minimum)
- Have a clear title
- Have helpful description text
- Include a call-to-action when appropriate

```tsx
<div className="card p-12 text-center">
  <Film className="h-12 w-12 text-gray-400 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-gray-900 mb-2">No movies yet</h3>
  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
    Start building your collection by adding your first movie.
  </p>
  <button className="btn-primary">Add Movie</button>
</div>
```

### Loading States

Loading states should maintain layout structure:

```tsx
// Skeleton cards that match real content dimensions
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {[1, 2, 3, 4].map(i => (
    <div key={i} className="card p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-3/4" />
    </div>
  ))}
</div>
```

---

## Dashboard & Stats Patterns

**Dashboards are the first impression. They must feel polished and informative.**

### Stat Card Component

```tsx
interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: string
  trendUp?: boolean
  color?: 'purple' | 'gold' | 'green' | 'blue'
}

function StatCard({ label, value, icon: Icon, trend, trendUp, color = 'purple' }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    gold: 'bg-gold-50 text-gold-600 border-gold-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
  }

  return (
    <div className={`card p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          {label}
        </span>
        {Icon && <Icon className="h-5 w-5 opacity-60" />}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}
```

### Stats Row Layout

```tsx
// ALWAYS use responsive grid, NEVER flex with wrap for stats
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
  <StatCard label="Total Users" value={1234} icon={Users} color="purple" />
  <StatCard label="Revenue" value="$12.5k" icon={DollarSign} color="green" />
  <StatCard label="Orders" value={89} icon={ShoppingBag} color="gold" />
  <StatCard label="Conversion" value="3.2%" icon={TrendingUp} color="blue" />
</div>
```

### Featured/Hero Stats

For the most important stat on a page:

```tsx
<div className="card bg-gradient-to-br from-purple-600 to-purple-800 p-8 text-white mb-8">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-purple-200 text-sm font-medium uppercase tracking-wide mb-2">
        Total Points
      </p>
      <p className="text-5xl font-bold mb-2">2,847</p>
      <p className="text-purple-200">
        You're ranked #3 in the league
      </p>
    </div>
    <Trophy className="h-16 w-16 text-purple-300" />
  </div>
</div>
```

### Dashboard Page Template

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your overview.</p>
      </div>

      {/* Featured Hero Stat (optional) */}
      <div className="card bg-gradient-to-br from-purple-600 to-purple-800 p-8 text-white">
        {/* Hero content */}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat cards */}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary content (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            {/* Main content */}
          </div>
        </div>

        {/* Sidebar content (1 col) */}
        <div className="space-y-6">
          <div className="card">
            {/* Secondary content */}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Tailwind CSS | 3.4.13 | Utility-first CSS framework |
| lucide-react | 0.445.0 | Icon library |
| clsx | 2.1.1 | Conditional class names |
| tailwind-merge | 3.4.0 | Class conflict resolution |

### Key Files

```
tailwind.config.ts    - Tailwind configuration with custom colors
app/globals.css       - Global styles and component classes
lib/utils.ts          - cn() utility for class merging
components/ui/        - Reusable UI components
```

### The cn() Utility

Always use `cn()` for combining classes. It handles conflicts intelligently:

```typescript
import { cn } from '@/lib/utils'

// Usage
className={cn(
  'base-classes here',
  conditional && 'conditional-classes',
  className // Allow overrides from props
)}
```

---

## Color System

### Primary Palette: Purple

The primary brand color. Use for main actions, active states, and key UI elements.

```
purple-50   #faf5ff   Very light backgrounds
purple-100  #f3e8ff   Light highlights
purple-200  #e9d5ff   Borders on purple backgrounds
purple-500  #a855f7   Medium emphasis
purple-600  #9333ea   PRIMARY - Buttons, links, active states
purple-700  #7e22ce   Hover states
purple-800  #6b21a8   Dark backgrounds
purple-900  #581c87   Sidebar, hero gradients
```

### Secondary Palette: Gold

Accent color for achievements, secondary actions, and highlights.

```
gold-50   #fffbeb   Light backgrounds
gold-100  #fef3c7   Highlights
gold-200  #fde68a   Borders
gold-400  #fbbf24   Logo accents
gold-500  #f59e0b   SECONDARY - Buttons, badges
gold-600  #d97706   Hover states
gold-900  #78350f   Text on gold backgrounds
```

### Neutral Palette: Gray

Use Tailwind's default gray scale:

```
gray-50   #f9fafb   Page backgrounds
gray-100  #f3f4f6   Subtle backgrounds, dividers
gray-200  #e5e7eb   Borders
gray-300  #d1d5db   Input borders
gray-500  #6b7280   Secondary text
gray-600  #4b5563   Body text
gray-700  #374151   Emphasized text
gray-900  #111827   Headings, primary text
```

### Semantic Colors

```
Success:  green-50 (bg), green-600 (text/border), green-100 (light)
Error:    red-50 (bg), red-600 (text/border), red-100 (light)
Warning:  Use gold colors
Info:     Use purple colors
```

### Gradient Patterns

```css
/* Hero/Header gradient */
bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900

/* Countdown/Highlight gradient */
bg-gradient-to-r from-purple-600 to-purple-700

/* Glassmorphism on dark backgrounds */
bg-white/10 backdrop-blur
```

---

## Typography

### Font Family

**Inter** from Google Fonts with system fallbacks:

```typescript
// Already configured in app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

### Type Scale

| Element | Classes | Usage |
|---------|---------|-------|
| Hero H1 | `text-3xl md:text-5xl lg:text-6xl font-bold` | Landing page hero |
| Page H1 | `text-2xl font-bold text-gray-900` | Dashboard page titles |
| Section H2 | `text-xl font-semibold text-gray-900` | Section headings |
| Card Title | `text-lg font-semibold text-gray-900` | Card headers |
| Body | `text-base text-gray-600` | Standard paragraphs |
| Small | `text-sm text-gray-600` | Secondary information |
| Tiny | `text-xs text-gray-500` | Metadata, timestamps |
| Monospace | `font-mono text-sm` | Scores, data, code |

### Text Colors

```
Primary text:    text-gray-900
Secondary text:  text-gray-600
Tertiary text:   text-gray-500
Muted text:      text-gray-400
Link text:       text-purple-600 hover:text-purple-700
On dark bg:      text-white, text-white/90, text-purple-100
```

---

## Spacing & Layout

### Spacing Scale

Use Tailwind's default 4px base unit:

```
1  = 0.25rem (4px)
2  = 0.5rem  (8px)
3  = 0.75rem (12px)
4  = 1rem    (16px)   <- Common
6  = 1.5rem  (24px)   <- Common
8  = 2rem    (32px)
12 = 3rem    (48px)
16 = 4rem    (64px)
20 = 5rem    (80px)
```

### Common Spacing Patterns

```css
/* Component internal padding */
p-3   /* Compact */
p-4   /* Standard */
p-6   /* Spacious */

/* Gaps between elements */
gap-2   /* Tight */
gap-4   /* Standard */
gap-6   /* Loose */

/* Vertical rhythm */
space-y-4   /* Standard stack */
space-y-6   /* Loose stack */
mb-6, mb-8  /* Section separation */
```

### Layout Containers

```html
<!-- Main content container -->
<div className="max-w-7xl mx-auto">

<!-- Page padding (responsive) -->
<div className="p-4 sm:p-6 lg:p-8">

<!-- Dashboard layout with sidebar -->
<div className="min-h-screen bg-gray-50">
  <NavSidebar />
  <main className="lg:ml-64">
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      {children}
    </div>
  </main>
</div>
```

### Grid Patterns

```css
/* 2-column on tablet, 3-column on desktop */
grid md:grid-cols-2 lg:grid-cols-3 gap-6

/* 2-column on tablet and up */
grid gap-4 md:grid-cols-2

/* Auto-fit responsive grid */
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4
```

---

## Responsive Design

### Breakpoints

```
sm:  640px   (small tablets)
md:  768px   (tablets)
lg:  1024px  (desktops) - KEY: sidebar becomes visible
xl:  1280px  (large desktops)
```

### Mobile-First Approach

Always write mobile styles first, then add breakpoint modifiers:

```html
<!-- BAD: Desktop-first -->
<div className="grid-cols-3 md:grid-cols-2 sm:grid-cols-1">

<!-- GOOD: Mobile-first -->
<div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

### Common Responsive Patterns

```css
/* Text sizing */
text-sm sm:text-base
text-2xl md:text-4xl lg:text-5xl

/* Padding scaling */
p-4 sm:p-6 lg:p-8

/* Flex direction change */
flex flex-col lg:flex-row

/* Hide/show elements */
hidden lg:block          /* Show only on desktop */
lg:hidden                /* Hide on desktop */

/* Sidebar layout */
lg:ml-64                 /* Margin for fixed sidebar on desktop */
pt-16 lg:pt-8            /* Extra top padding on mobile for menu */
```

### Sidebar Behavior

```
Mobile (< 1024px):
- Sidebar hidden by default (-translate-x-full)
- Hamburger menu in top-left
- Overlay when open
- Main content full width

Desktop (>= 1024px):
- Sidebar always visible (translate-x-0)
- Fixed position, w-64 (256px)
- Main content offset with ml-64
```

---

## Component Patterns

### Component Architecture

1. **Composable**: Break into logical sub-components
2. **Variant-based**: Use variant props for style variations
3. **Size props**: Support multiple sizes where appropriate
4. **Class forwarding**: Always accept and merge `className` prop

### Card Component

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent>
    Your content here
  </CardContent>
</Card>
```

### Badge Component

```tsx
import { Badge } from '@/components/ui/Badge'

// Variants: default, purple, gold, green, red, gray
<Badge variant="purple">Active</Badge>
<Badge variant="gold">Winner</Badge>
<Badge variant="green">Success</Badge>
<Badge variant="red">Error</Badge>
```

### Avatar Component

```tsx
import { Avatar } from '@/components/ui/Avatar'

// Sizes: sm, md, lg, xl
<Avatar name="John Doe" imageUrl="/path/to/image.jpg" size="md" />
```

### EmptyState Component

```tsx
import { EmptyState } from '@/components/ui/EmptyState'

<EmptyState
  icon={Film}
  title="No movies found"
  description="Try adjusting your search criteria"
  action={<button className="btn-primary">Add Movie</button>}
/>
```

---

## Icons

### Library: lucide-react

Import icons individually as React components:

```tsx
import { Film, Trophy, Users, ChevronRight } from 'lucide-react'
```

### Icon Sizes

```css
h-3 w-3     /* Tiny, inline with small text */
h-4 w-4     /* Small, inline with body text */
h-5 w-5     /* Standard, buttons and list items */
h-6 w-6     /* Medium, section headers */
h-8 w-8     /* Large, feature cards */
h-12 w-12   /* Extra large, empty states */
```

### Icon Colors

```tsx
// Inherit text color
<Film className="h-5 w-5" />

// Specific color
<Trophy className="h-5 w-5 text-gold-500" />
<CheckCircle2 className="h-5 w-5 text-green-600" />
<AlertCircle className="h-5 w-5 text-red-600" />
```

### Common Icons Used

```
Navigation: Film, Trophy, Users, Calendar, Gavel, BookOpen, Shield
Actions:    Menu, X, ChevronRight, LogOut, Copy, Check, Search
Status:     CheckCircle2, Clock, AlertCircle, Loader2
Display:    Star, Medal, Award, DollarSign, TrendingUp, Rocket
```

---

## Forms & Inputs

### Input Styling

Use the `.input` class defined in globals.css:

```html
<input type="text" className="input" placeholder="Enter value" />
```

The `.input` class provides:
- Full width (`w-full`)
- Padding (`px-4 py-2`)
- Border (`border border-gray-300`)
- Rounded corners (`rounded-lg`)
- Focus ring (`focus:ring-2 focus:ring-purple-500`)
- Transition (`transition-all`)

### Labels

```html
<label className="label">Email Address</label>
<!-- or manually -->
<label className="block text-sm font-medium text-gray-700 mb-1">
```

### Form Layout

```html
<div className="space-y-4">
  <div>
    <label className="label">Name</label>
    <input type="text" className="input" />
  </div>
  <div>
    <label className="label">Email</label>
    <input type="email" className="input" />
  </div>
  <button type="submit" className="btn-primary">Submit</button>
</div>
```

### Error States

```html
<input
  type="text"
  className="input border-red-300 bg-red-50 focus:ring-red-500"
/>
<p className="text-sm text-red-600 mt-1">This field is required</p>
```

---

## Buttons

### Button Classes

Defined in globals.css using @apply:

```css
.btn-primary {
  @apply bg-purple-600 text-white px-4 py-2 rounded-lg font-medium
         hover:bg-purple-700 transition-colors
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gold-500 text-gold-900 px-4 py-2 rounded-lg font-medium
         hover:bg-gold-600 transition-colors
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-outline {
  @apply border border-gray-300 text-gray-700 px-4 py-2 rounded-lg
         font-medium hover:bg-gray-50 transition-colors
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-danger {
  @apply bg-red-600 text-white px-4 py-2 rounded-lg font-medium
         hover:bg-red-700 transition-colors
         disabled:opacity-50 disabled:cursor-not-allowed;
}
```

### Usage

```html
<button className="btn-primary">Save Changes</button>
<button className="btn-secondary">View Details</button>
<button className="btn-outline">Cancel</button>
<button className="btn-danger">Delete</button>

<!-- Disabled state -->
<button className="btn-primary" disabled>Processing...</button>

<!-- With icon -->
<button className="btn-primary flex items-center gap-2">
  <Plus className="h-4 w-4" />
  Add Item
</button>
```

### Size Variations

```html
<!-- Small -->
<button className="btn-primary text-sm px-3 py-1.5">Small</button>

<!-- Large -->
<button className="btn-primary text-lg px-6 py-3">Large</button>

<!-- Full width -->
<button className="btn-primary w-full">Full Width</button>
```

---

## Cards & Containers

### Base Card

```css
.card {
  @apply bg-white rounded-xl shadow-sm border border-gray-200;
}
```

### Card Structure

```tsx
<div className="card">
  {/* Optional header */}
  <div className="px-6 py-4 border-b border-gray-100">
    <h3 className="text-lg font-semibold text-gray-900">Title</h3>
  </div>
  {/* Content */}
  <div className="p-6">
    Content here
  </div>
</div>
```

### Card Variants

```html
<!-- Standard -->
<div className="card">

<!-- Interactive (clickable) -->
<div className="card hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">

<!-- Colored (status indicator) -->
<div className="card bg-purple-50/50 border-purple-200">
<div className="card bg-gold-50/50 border-gold-200">
<div className="card bg-green-50/50 border-green-200">
```

### Alert Containers

```html
<!-- Error -->
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
  <p className="text-red-800">Error message</p>
</div>

<!-- Success -->
<div className="bg-green-50 border border-green-200 rounded-lg p-4">
  <p className="text-green-800">Success message</p>
</div>

<!-- Info -->
<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
  <p className="text-purple-800">Info message</p>
</div>
```

### Section Container

```html
<section className="mb-8">
  <h2 className="text-xl font-semibold text-gray-900 mb-4">Section Title</h2>
  <div className="card">
    Content
  </div>
</section>
```

---

## Animations & Transitions

### Standard Transitions

```css
/* Color transitions (buttons, links) */
transition-colors

/* All properties (cards, hover effects) */
transition-all

/* Transform animations */
transition-transform duration-200 ease-in-out
```

### Hover Effects

```css
/* Subtle lift */
hover:-translate-y-1 transition-all

/* Scale up */
hover:scale-[1.02] transition-all

/* Shadow increase */
hover:shadow-lg transition-all

/* Combined (cards) */
hover:shadow-lg hover:-translate-y-1 transition-all
```

### Loading Spinner

```tsx
import { Loader2 } from 'lucide-react'

<Loader2 className="h-5 w-5 animate-spin" />

// With text
<div className="flex items-center gap-2">
  <Loader2 className="h-4 w-4 animate-spin" />
  <span>Loading...</span>
</div>
```

### Sidebar Animation

```css
/* Closed */
-translate-x-full

/* Open */
translate-x-0

/* Transition */
transition-transform duration-200 ease-in-out
```

### Progress Bar Animation

```tsx
<div
  className="h-full bg-purple-600 rounded-full transition-all duration-300"
  style={{ width: `${percentage}%` }}
/>
```

---

## Code Examples

### Complete Page Layout

```tsx
import { Header } from '@/components/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function ExamplePage() {
  return (
    <div className="space-y-6">
      <Header
        title="Page Title"
        subtitle="Optional description"
      >
        <button className="btn-primary">Action</button>
      </Header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Card One</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Content here</p>
          </CardContent>
        </Card>
        {/* More cards... */}
      </div>
    </div>
  )
}
```

### Complete Form

```tsx
export default function ExampleForm() {
  return (
    <form className="card max-w-md">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Form Title</h2>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input
            id="name"
            type="text"
            className="input"
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary">
            Submit
          </button>
          <button type="button" className="btn-outline">
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}
```

### Responsive Grid with Cards

```tsx
import { Film, Star, Calendar } from 'lucide-react'

export default function FeatureGrid() {
  const features = [
    { icon: Film, title: 'Movies', description: 'Browse and track' },
    { icon: Star, title: 'Ratings', description: 'Rate and review' },
    { icon: Calendar, title: 'Schedule', description: 'Plan watchlist' },
  ]

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="card p-6 hover:shadow-lg hover:-translate-y-1 transition-all"
        >
          <feature.icon className="h-8 w-8 text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {feature.title}
          </h3>
          <p className="text-gray-600">{feature.description}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## Quick Reference Cheat Sheet

```
COLORS
  Primary action:     bg-purple-600, text-purple-600
  Secondary action:   bg-gold-500, text-gold-500
  Page background:    bg-gray-50
  Card background:    bg-white
  Primary text:       text-gray-900
  Secondary text:     text-gray-600
  Borders:            border-gray-200

SPACING
  Padding (cards):    p-4, p-6
  Gaps:               gap-2, gap-4, gap-6
  Margins:            mb-4, mb-6, mb-8

TYPOGRAPHY
  Heading:            text-2xl font-bold
  Subheading:         text-lg font-semibold
  Body:               text-base text-gray-600
  Small:              text-sm text-gray-500

COMPONENTS
  Card:               bg-white rounded-xl shadow-sm border border-gray-200
  Input:              .input (defined in globals.css)
  Button primary:     .btn-primary
  Button secondary:   .btn-secondary
  Badge:              <Badge variant="purple">

RESPONSIVE
  Mobile menu hide:   lg:hidden
  Show on desktop:    hidden lg:block
  Sidebar margin:     lg:ml-64
  Grid columns:       grid-cols-1 md:grid-cols-2 lg:grid-cols-3

ICONS
  Standard size:      h-5 w-5
  With text:          flex items-center gap-2
  Loading:            <Loader2 className="h-5 w-5 animate-spin" />
```

---

*Last updated: January 2026*
*EFSMovie Fantasy Movie League*

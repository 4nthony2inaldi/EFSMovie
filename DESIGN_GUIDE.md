# EFSMovie Design System Guide

A comprehensive design methodology guide for maintaining visual consistency across the application. Use this document when building new features or working in other Claude Code sessions.

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Technology Stack](#technology-stack)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Responsive Design](#responsive-design)
7. [Component Patterns](#component-patterns)
8. [Icons](#icons)
9. [Forms & Inputs](#forms--inputs)
10. [Buttons](#buttons)
11. [Cards & Containers](#cards--containers)
12. [Animations & Transitions](#animations--transitions)
13. [Code Examples](#code-examples)

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

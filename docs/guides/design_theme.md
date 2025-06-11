# Design Theme: TSA Coach Dashboard Cards

## Overview
The Texas Sports Academy coach dashboard features a sophisticated card-based design system that emphasizes clarity, hierarchy, and actionable information. The cards use a consistent visual language while serving different functional purposes.

## Card Types

### 1. Quick Action Cards
**Purpose:** Navigation shortcuts and quick access to key features

**Design Characteristics:**
- Clean white background with subtle gray border (`border-gray-200`)
- Rounded corners (`rounded-lg`) for modern feel
- Horizontal layout with icon-left, content-center, chevron-right pattern
- Compact padding (`p-4`) for efficiency
- Hover state with shadow elevation (`hover:shadow-md`)
- Icon housed in light gray container (`bg-gray-100 rounded-lg`)

**Visual Hierarchy:**
```
[Icon Container] [Title] ────────────────── [Chevron →]
```

### 2. Feature Dashboard Cards
**Purpose:** Display complex information with actionable content (Applications, Events, Activity)

**Design Characteristics:**
- **Structure:** Header + Content sections with clear visual separation
- **Header:** Light gray background (`bg-gray-50/50`) with bottom border
- **Content:** Divided sections using `divide-y divide-gray-100`
- **Corners:** More pronounced rounding (`rounded-xl`) for prominence
- **Overflow:** `overflow-hidden` for clean edge treatment

**Header Pattern:**
```
[Colored Icon] [Title] ────────────────── [Action Link]
     │
     └── Color-coded: Green(applications), Purple(events), Gray(activity)
```

**Content Pattern:**
```
[Avatar/Icon] [Name/Title]           [Status Badge] [→]
              [Subtitle/Meta]
─────────────────────────────────────────────────────
[Next Item...]
```

### 3. Avatar/Icon Treatment
**Consistent sizing and color coding:**
- **Size:** `w-10 h-10` (40px) for list items
- **Shape:** `rounded-full` for people, `rounded-lg` for objects
- **Colors:** Semantic backgrounds with matching border colors
  - Green: `bg-green-50 border-green-200` (positive actions)
  - Blue: `bg-blue-50 border-blue-200` (informational)
  - Purple: `bg-purple-50 border-purple-200` (events)
  - Orange: `bg-orange-50 border-orange-200` (pending items)

## Color System

### Primary Brand Color
- **TSA Blue:** `#004aad` with variants `#003888` (hover)
- **Usage:** Primary actions, current states, brand elements

### Status Colors
- **Success/Completed:** Green (`bg-green-500`, `text-green-700`)
- **Warning/Pending:** Amber (`color="amber"`)
- **Information:** Blue (`color="blue"`)
- **Neutral:** Zinc/Gray (`color="zinc"`)

### Background Hierarchy
- **Page Background:** Light gray (`bg-gray-50`)
- **Card Background:** Pure white (`bg-white`)
- **Section Dividers:** Very light gray (`bg-gray-50/50`)
- **Hover States:** Light gray (`hover:bg-gray-50`)

## Interactive States

### Hover Behaviors
- **Cards:** Subtle shadow elevation and background color change
- **Links:** Color transitions to darker variants
- **Buttons:** Background color intensification

### Accessibility Features
- **Focus States:** Clear visual indicators
- **Semantic Colors:** Consistent color meaning across interface
- **Text Contrast:** High contrast ratios maintained
- **Interactive Elements:** Clear hit targets with adequate spacing

## Layout Principles

### Responsive Grid System
- **Mobile:** Single column (`grid-cols-1`)
- **Tablet:** Two columns (`sm:grid-cols-2`)
- **Desktop:** Up to four columns (`lg:grid-cols-4`)

### Spacing Consistency
- **Card Padding:** `p-4` (small), `px-6 py-4` (headers), `px-6 py-5` (content)
- **Gap Spacing:** `gap-6` between cards, `gap-3` between related elements
- **Margins:** `mb-8` for major sections

### Typography Hierarchy
- **Card Titles:** `text-lg font-semibold text-gray-900`
- **Item Names:** `text-sm font-semibold text-gray-900`
- **Meta Information:** `text-sm text-gray-600`
- **Action Links:** `text-sm font-medium text-[#004aad]`

## Content Patterns

### Information Density
Cards balance information richness with visual cleanliness:
- **Primary Information:** Name/title prominently displayed
- **Secondary Information:** Date, time, count metadata
- **Status Indicators:** Color-coded badges
- **Actions:** Subtle chevron indicators suggest interactivity

### Empty States & Loading
- **Skeleton Loading:** Gray placeholder rectangles
- **Error States:** Clear messaging with retry options
- **Empty Content:** Helpful guidance for next actions

## Design Philosophy
The card system prioritizes **scannable content**, **clear hierarchy**, and **consistent interaction patterns**. Each card serves as a self-contained unit of information while maintaining visual cohesion with the overall dashboard aesthetic. The design balances professional functionality with approachable visual warmth appropriate for an educational platform. 
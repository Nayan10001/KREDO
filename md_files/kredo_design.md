# KREDO — Frontend Design Specification

> **Verifiable Intelligence** — a multi-agent fact-checking platform, reimagined.
> This document is the single source of truth for the reimagined KREDO frontend.
> It covers design philosophy, color tokens, typography, spacing, every component,
> every view, animation specs, and iconography.

**Repository reimagined from:** https://github.com/Nayan10001/KREDO
**Frontend stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · Framer Motion · Recharts
**Document version:** 1.0
**Last updated:** 2025-06-21

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing, Radius & Layout](#4-spacing-radius--layout)
5. [Custom Utility Classes](#5-custom-utility-classes)
6. [Component Inventory](#6-component-inventory)
7. [Shared Components](#7-shared-components)
8. [App Shell](#8-app-shell)
9. [Verify View](#9-verify-view)
10. [Dashboard View](#10-dashboard-view)
11. [Agents View](#11-agents-view)
12. [History View](#12-history-view)
13. [Sources View](#13-sources-view)
14. [Animation Specifications](#14-animation-specifications)
15. [Iconography](#15-iconography)
16. [File Structure](#16-file-structure)
17. [Responsive Breakpoints](#17-responsive-breakpoints)

---

## 1. Design Philosophy

KREDO's original frontend leaned into a "hacker terminal" aesthetic — near-black background, neon-green glow, monospaced everything, blinking cursors. While distinctive, it limited scannability and made the product feel like a tool for engineers rather than a platform for journalists, fact-checkers, and citizens.

The reimagined KREDO keeps the **multi-agent pipeline as the soul** of the product but reframes the visual language as **"intelligence-grade verification"** — the feeling of a professional OSINT dashboard, not a sci-fi movie prop.

### Pillars

| Pillar | Translation into UI |
|---|---|
| **Verifiable** | Every claim is traceable to a source. Citations are first-class UI citizens, not footnotes. |
| **Calm authority** | Dark slate base, emerald truth-accent. No glow overload. Animations are precise, not theatrical. |
| **Pipeline transparency** | The 7-agent pipeline is always visible — as a live stream during analysis, as an explorable diagram on the Agents view. |
| **Density without clutter** | Compact typography, generous whitespace between sections, monospaced numerics for tabular data. |
| **Honest verdicts** | Color semantics are unambiguous: emerald = supported, amber = misleading, rose = contradicted, slate = unverified. No traffic-light ambiguity. |

---

## 2. Color System

The palette is defined in `src/app/globals.css` using CSS custom properties on `:root`. All colors are in **OKLCH** for perceptual uniformity and easy alpha blending via `color-mix(in oklch, …)`.

### 2.1 Surface Tokens

| Token | OKLCH | Role |
|---|---|---|
| `--background` | `oklch(0.16 0.012 250)` | App background — warm dark slate |
| `--foreground` | `oklch(0.96 0.005 250)` | Primary text — near-white with faint blue cast |
| `--card` | `oklch(0.205 0.014 250)` | Card surfaces (one step lighter than bg) |
| `--card-foreground` | `oklch(0.96 0.005 250)` | Text on cards |
| `--popover` | `oklch(0.235 0.014 250)` | Popovers / dropdowns (two steps lighter) |
| `--popover-foreground` | `oklch(0.96 0.005 250)` | Text on popovers |
| `--secondary` | `oklch(0.27 0.014 250)` | Secondary surfaces |
| `--secondary-foreground` | `oklch(0.94 0.005 250)` | Text on secondary |
| `--muted` | `oklch(0.24 0.012 250)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.68 0.012 250)` | Muted text — meta labels, timestamps |
| `--accent` | `oklch(0.30 0.04 155)` | Accent surface (emerald-tinted dark) |
| `--accent-foreground` | `oklch(0.96 0.01 155)` | Text on accent |
| `--border` | `oklch(1 0 0 / 8%)` | Hairline borders — 8% white |
| `--input` | `oklch(1 0 0 / 10%)` | Input field backgrounds — 10% white |
| `--ring` | `oklch(0.78 0.18 155)` | Focus rings — emerald |

### 2.2 Brand & Semantic Tokens

| Token | OKLCH | Role |
|---|---|---|
| `--primary` | `oklch(0.78 0.18 155)` | **Emerald** — the KREDO truth-accent. Used on CTAs, active nav, verdict highlights. |
| `--primary-foreground` | `oklch(0.18 0.04 155)` | Dark emerald — text on emerald buttons |
| `--destructive` | `oklch(0.65 0.22 25)` | **Rose** — destructive actions, HIGH risk |
| `--ring` | `oklch(0.78 0.18 155)` | Focus ring color |

### 2.3 KREDO Verdict Tokens

These are custom to KREDO and drive the verdict color system across the app.

| Token | OKLCH | Hex (approx) | Verdict |
|---|---|---|---|
| `--verdict-supported` | `oklch(0.72 0.19 155)` | `#3dd684` | **SUPPORTED** / CREDIBLE |
| `--verdict-contradicted` | `oklch(0.64 0.22 25)` | `#e85d5d` | **CONTRADICTED** / UNRELIABLE |
| `--verdict-misleading` | `oklch(0.78 0.16 75)` | `#e8b94d` | **MISLEADING** / MIXED |
| `--verdict-unverified` | `oklch(0.68 0.012 250)` | `#8b95b3` | **UNVERIFIED** |

### 2.4 Chart Palette (Recharts)

| Token | OKLCH | Used for |
|---|---|---|
| `--chart-1` | `oklch(0.78 0.18 155)` | Emerald — credible / supported |
| `--chart-2` | `oklch(0.82 0.16 75)` | Amber — mixed / misleading |
| `--chart-3` | `oklch(0.65 0.22 25)` | Rose — unreliable / contradicted |
| `--chart-4` | `oklch(0.72 0.14 230)` | Sky — unverified / neutral |
| `--chart-5` | `oklch(0.70 0.18 300)` | Violet — translation / feedback loop |

### 2.5 Sidebar Tokens

| Token | OKLCH |
|---|---|
| `--sidebar` | `oklch(0.185 0.014 250)` |
| `--sidebar-foreground` | `oklch(0.94 0.005 250)` |
| `--sidebar-primary` | `oklch(0.78 0.18 155)` |
| `--sidebar-primary-foreground` | `oklch(0.18 0.04 155)` |
| `--sidebar-accent` | `oklch(0.27 0.014 250)` |
| `--sidebar-accent-foreground` | `oklch(0.96 0.005 250)` |
| `--sidebar-border` | `oklch(1 0 0 / 7%)` |
| `--sidebar-ring` | `oklch(0.78 0.18 155)` |

### 2.6 Tailwind Color Aliases (in practice)

These are the actual Tailwind class names used throughout the codebase. They map to the tokens above via `@theme inline` in `globals.css`.

| Tailwind class | Hex (approx) | Usage examples |
|---|---|---|
| `bg-background` | `#0f1117` | App background |
| `bg-card` | `#181b22` | Cards, assistant bubble |
| `bg-muted` | `#23262e` | Hover states, secondary surfaces |
| `bg-sidebar` | `#161920` | Sidebar |
| `text-foreground` | `#f5f5f7` | Primary text |
| `text-muted-foreground` | `#8b8e96` | Meta text |
| `bg-emerald-500/10` | emerald @ 10% | Active nav, badges |
| `bg-emerald-500/15` | emerald @ 15% | Hover, focus |
| `bg-emerald-500/12` | emerald @ 12% | Verdict badge bg |
| `text-emerald-300` | `#6ee7b7` | Verdict text, accents |
| `text-emerald-400` | `#34d399` | Icons, links |
| `bg-rose-500/12` | rose @ 12% | Contradicted badge bg |
| `text-rose-300` | `#fda4af` | Contradicted text |
| `bg-amber-500/12` | amber @ 12% | Misleading badge bg |
| `text-amber-300` | `#fcd34d` | Misleading text |
| `bg-violet-500/12` | violet @ 12% | Translation badge bg |
| `text-violet-300` | `#c4b5fd` | Translation text |

---

## 3. Typography

### 3.1 Font Families

| Token | Font | Role |
|---|---|---|
| `--font-sans` (`--font-geist-sans`) | **Geist Sans** (Vercel) | Headings, body, labels |
| `--font-mono` (`--font-geist-mono`) | **Geist Mono** | Numerics, code, agent IDs, timestamps, verdict labels |

Loaded via `next/font/google` in `src/app/layout.tsx`.

> **Design choice:** The original KREDO used IBM Plex Mono for body text — a strong terminal signal. We retain monospace for **numerics and meta labels** (which benefit from tabular alignment) but switch body to **Geist Sans** for readability at small sizes.

### 3.2 Type Scale

| Class | Size | Line height | Weight | Usage |
|---|---|---|---|---|
| `text-6xl` | 3.75rem / 60px | 1.05 | 700 | Hero title (`"Unmask the truth."`) |
| `text-3xl` | 1.875rem / 30px | 1.2 | 700 | View titles (`"Dashboard"`, `"History"`) |
| `text-2xl` | 1.5rem / 24px | 1.3 | 700 | Card section titles |
| `text-xl` | 1.25rem / 20px | 1.4 | 700 | Verdict headline (`"CREDIBLE"`) |
| `text-base` | 1rem / 16px | 1.5 | 400 | Body text |
| `text-sm` | 0.875rem / 14px | 1.5 | 400 | Default body in dense UI |
| `text-xs` | 0.75rem / 12px | 1.5 | 400 | Meta labels, item text |
| `text-[11px]` | 11px | 1.4 | 400 | Timestamps, meta in cards |
| `text-[10px]` | 10px | 1.4 | 500 | Mono-uppercase labels |
| `text-[10px] uppercase tracking-wider` | 10px | 1.4 | 500 | Section eyebrows (`"OVERALL VERDICT"`, `"INPUTS"`, `"OUTPUTS"`) |

### 3.3 Font Feature Settings

Applied globally on `body`:
```css
font-feature-settings: "ss01", "cv11";
```
- `ss01` — alternate stylistic set in Geist Sans (slightly rounder `a`)
- `cv11` — alternate `0` with slash for unambiguous numerics

### 3.4 Numeric Styling

All numeric values use:
- `font-mono` family
- `tabular-nums` (so digits align in columns)
- `font-bold` for scores and counts

Example: `42`, `87/100`, `2.1s`, `1,248`.

---

## 4. Spacing, Radius & Layout

### 4.1 Radius

```css
--radius: 0.75rem;  /* 12px base */
```

| Class | Radius | Usage |
|---|---|---|
| `rounded` | 4px | Small inline elements |
| `rounded-md` | 6px | Badges, small buttons |
| `rounded-lg` | 8px | Buttons, input fields, nav items |
| `rounded-xl` | 12px | Cards, agent nodes, badges |
| `rounded-2xl` | 16px | Hero input card, hero block, message bubbles |
| `rounded-full` | 9999px | Pills, dots, the truth meter thumb |

### 4.2 Spacing Scale

We use Tailwind's default 4px scale. Most common values in KREDO:

| Class | Px | Usage |
|---|---|---|
| `gap-1` | 4px | Icon + text inside badges |
| `gap-1.5` | 6px | Small button icon + label |
| `gap-2` | 8px | Inline meta info |
| `gap-2.5` | 10px | Card header icon + text |
| `gap-3` | 12px | Card body sections |
| `gap-4` | 16px | Stat card grid |
| `gap-6` | 24px | Major view sections |
| `p-3` | 12px | Compact card padding |
| `p-4` | 16px | Standard card padding |
| `p-5` | 20px | Section card padding |
| `p-6` | 24px | Hero block padding |
| `px-4 lg:px-8` | 16/32px | View horizontal padding |
| `py-6 lg:py-8` | 24/32px | View vertical padding |

### 4.3 Layout Grid

- **App shell:** `min-h-screen flex` — 256px sidebar (`w-64`) + flex-1 main column
- **View max-width:** `max-w-7xl mx-auto` (1280px) for dashboard/history/sources; `max-w-3xl` (768px) for hero input; `max-w-4xl` (896px) for chat stream
- **Header height:** `h-16` (64px), sticky top
- **Sidebar width:** `w-64` (256px) desktop; `w-72` (288px) mobile drawer

---

## 5. Custom Utility Classes

Defined in `globals.css` under `@layer utilities`. These are KREDO-specific and reusable across all components.

### 5.1 `kredo-grid-bg`

Subtle 40×40px grid pattern, used as a background decorative element on the Verify hero.

```css
.kredo-grid-bg {
  background-image:
    linear-gradient(to right, oklch(1 0 0 / 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(1 0 0 / 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

Apply with a radial mask to fade out at edges:
```html
<div class="absolute inset-0 kredo-grid-bg opacity-40 pointer-events-none
     [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
```

### 5.2 `kredo-glow-emerald`

Soft emerald glow shadow for emphasis on a single element.

```css
.kredo-glow-emerald {
  box-shadow:
    0 0 0 1px oklch(0.78 0.18 155 / 25%),
    0 8px 32px -8px oklch(0.78 0.18 155 / 35%);
}
```

### 5.3 `kredo-text-glow`

Text-level emerald glow (used sparingly, e.g. on the splash screen logo in the original).

```css
.kredo-text-glow {
  text-shadow: 0 0 16px oklch(0.78 0.18 155 / 40%);
}
```

### 5.4 `kredo-surface`

Frosted-glass surface treatment (semi-transparent + backdrop blur).

```css
.kredo-surface {
  background: oklch(0.205 0.014 250 / 75%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

### 5.5 `kredo-gradient-border`

A 1px gradient border using the `mask-composite` technique. Apply to an element that already has `rounded-*` and a background.

```css
.kredo-gradient-border::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    oklch(0.78 0.18 155 / 35%),
    oklch(1 0 0 / 5%) 50%,
    oklch(0.78 0.18 155 / 15%)
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

Used on: hero input card, hero verdict block, agent detail card.

### 5.6 Animations

| Class | Effect | Duration |
|---|---|---|
| `kredo-shimmer` | Horizontal shimmer sweep across an element | 2s linear infinite |
| `kredo-pulse-dot` | Pulse scale + opacity (for status dots) | 1.6s ease-in-out infinite |
| `kredo-blink` | Blink (for cursor) | 1.1s step-end infinite |
| `kredo-fade-in-up` | Fade in + translate up 8px | 0.4s cubic-bezier(0.22, 1, 0.36, 1) |

---

## 6. Component Inventory

All KREDO components live under `src/components/kredo/` and follow a three-bucket structure:

```
src/components/kredo/
├── app-shell.tsx                  # The app frame (sidebar + header + view switcher)
├── shared/                        # Reusable primitives
│   ├── kredo-logo.tsx
│   ├── truth-meter.tsx
│   └── verdict-badge.tsx
├── verify/                        # Verify-view-specific components
│   ├── agent-pipeline.tsx
│   └── verdict-display.tsx
└── views/                         # Top-level views
    ├── verify-view.tsx
    ├── dashboard-view.tsx
    ├── agents-view.tsx
    ├── history-view.tsx
    └── sources-view.tsx
```

Total: **11 custom components**, plus shadcn/ui primitives (`Button`, `Card`, `Input`, `Toaster`).

---

## 7. Shared Components

### 7.1 `<KredoLogo />`

**File:** `src/components/kredo/shared/kredo-logo.tsx`

The KREDO brandmark — a stylised "K" with an integrated verification tick inside a rounded emerald tile, plus an optional wordmark.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number` | `32` | Tile size in px (logo scales proportionally) |
| `withWordmark` | `boolean` | `true` | Show the "KREDO" wordmark + tagline next to the tile |
| `className` | `string` | — | Additional classes |

**Anatomy:**

```
┌──────────────────────────────────────────────┐
│  ┌──────┐                                    │
│  │  K✓  │  KREDO                            │
│  │      │  VERIFIABLE INTELLIGENCE          │
│  └──────┘                                    │
└──────────────────────────────────────────────┘
```

**Styling:**
- Tile: `rounded-xl bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/40`
- Tile size: `size` × `size` px
- SVG stroke color: `oklch(0.85 0.18 155)` (bright emerald)
- Stroke width: 2.4
- Wordmark "KREDO": `font-semibold tracking-tight`, size = `size × 0.5`
- Tagline: `font-mono text-emerald-400/80 tracking-[0.12em] uppercase`, size = `size × 0.22`

---

### 7.2 `<TruthMeter />`

**File:** `src/components/kredo/shared/truth-meter.tsx`

A 270° arc gauge that animates from 0 to the target score on mount. Color shifts with the score band.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `score` | `number` | required | 0–100 trust score |
| `size` | `number` | `140` | Diameter in px |
| `label` | `string` | — | Label under the number (e.g. `"Trust Score"`) |
| `sublabel` | `string` | — | Smaller sub-label (e.g. `"3 claims"`) |
| `animate` | `boolean` | `true` | Animate the arc fill on mount |
| `className` | `string` | — | Additional classes |

**Color bands:**

| Score range | Color | OKLCH |
|---|---|---|
| ≥ 70 | Emerald | `oklch(0.78 0.18 155)` |
| 50–69 | Amber | `oklch(0.82 0.16 75)` |
| 30–49 | Orange | `oklch(0.78 0.16 50)` |
| < 30 | Rose | `oklch(0.65 0.22 25)` |

**Animation:**
- Duration: 1200ms
- Easing: cubic-bezier `1 - (1-t)³` (easeOutCubic)
- Implementation: `requestAnimationFrame` loop in `useEffect`
- Drop shadow: `drop-shadow(0 0 8px {color} / 35%)`

**Layout:**
- Stroke width: `size × 0.07`
- Arc fraction: 0.75 (270°)
- Background track: `oklch(1 0 0 / 6%)`
- Number font size: `size × 0.26`
- `/100` font size: `size × 0.08`
- SVG rotated `-135deg` so the arc opens at the bottom

---

### 7.3 `<VerdictBadge />`

**File:** `src/components/kredo/shared/verdict-badge.tsx`

A pill-shaped badge for verdicts (`SUPPORTED`, `CONTRADICTED`, `MISLEADING`, `UNVERIFIED`) and overall credibility (`CREDIBLE`, `MIXED`, `UNRELIABLE`).

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `verdict` | `string` | required | Verdict string (case-insensitive) |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `showDot` | `boolean` | `true` | Show leading dot |
| `className` | `string` | — | Additional classes |

**Verdict styles:**

| Verdict | Background | Text | Ring | Dot | Label |
|---|---|---|---|---|---|
| `SUPPORTED` / `CREDIBLE` | `bg-emerald-500/12` | `text-emerald-300` | `ring-emerald-500/30` | `bg-emerald-400` | Supported / Credible |
| `CONTRADICTED` / `UNRELIABLE` | `bg-rose-500/12` | `text-rose-300` | `ring-rose-500/30` | `bg-rose-400` | Contradicted / Unreliable |
| `MISLEADING` / `MIXED` | `bg-amber-500/12` | `text-amber-300` | `ring-amber-500/30` | `bg-amber-400` | Misleading / Mixed |
| `UNVERIFIED` | `bg-slate-400/12` | `text-slate-300` | `ring-slate-400/25` | `bg-slate-400` | Unverified |

**Size variants:**

| Size | Text | Padding | Gap | Dot |
|---|---|---|---|---|
| `sm` | `text-[10px]` | `px-2 py-0.5` | `gap-1` | `h-1 w-1` |
| `md` | `text-xs` | `px-2.5 py-1` | `gap-1` | `h-1 w-1` |
| `lg` | `text-sm` | `px-3.5 py-1.5` | `gap-1.5` | `h-1.5 w-1.5` |

**Common classes (all sizes):**
`inline-flex items-center rounded-full font-mono font-medium uppercase tracking-wider ring-1 ring-inset`

The module also exports a `verdictStyle(verdict)` helper returning the style object, used by other components to color score text consistently.

---

## 8. App Shell

### 8.1 `<AppShell />`

**File:** `src/components/kredo/app-shell.tsx`

The app frame: persistent sidebar (desktop) / drawer (mobile), sticky header with breadcrumbs + status pill + GitHub link, and an animated view switcher.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `view` | `KredoView` | Currently active view |
| `onView` | `(v: KredoView) => void` | View change handler |
| `children` | `React.ReactNode` | View content |

**Layout:**

```
┌──────────┬────────────────────────────────────────────┐
│          │ ┌─ Header ──────────────────────────────┐  │
│          │ │ ☰ Workspace > verify   ● pipeline    │  │
│  Sidebar │ │   99.4% uptime          [GitHub]    │  │
│          │ └──────────────────────────────────────┘  │
│  KREDO   │                                            │
│  ─────   │                                            │
│  Verify  │           <view content>                   │
│  Dashbrd │                                            │
│  Agents  │                                            │
│  History │                                            │
│  Sources │                                            │
│          │                                            │
│  ─────   │                                            │
│  ● Pipe  │                                            │
│  online  │                                            │
│  1,248   │                                            │
│  checks  │                                            │
└──────────┴────────────────────────────────────────────┘
```

**Sidebar nav items:**

| View | Label | Icon | Description |
|---|---|---|---|
| `verify` | Verify | `ShieldCheck` | Run the 7-agent pipeline |
| `dashboard` | Dashboard | `LayoutDashboard` | Platform analytics |
| `agents` | Agents | `Network` | Explore the pipeline |
| `history` | History | `History` | Past fact-checks |
| `sources` | Sources | `Library` | Credibility library |

**Active nav styling:**
- Background: `bg-emerald-500/12`
- Text: `text-emerald-300`
- Active indicator: `motion.span` with `layoutId="sidebar-active"` — a 6×2px emerald bar pinned to the left edge, animates between nav items via Framer Motion shared layout

**Inactive nav styling:**
- Text: `text-muted-foreground`
- Hover: `text-foreground hover:bg-muted/60`

**Sidebar footer — pipeline status card:**
- Container: `p-4 m-3 rounded-xl bg-muted/40 ring-1 ring-inset ring-border`
- Status dot: `h-1.5 w-1.5 rounded-full bg-emerald-400 kredo-pulse-dot`
- Status text: `text-[11px] font-mono uppercase tracking-wider text-emerald-300/80` — "Pipeline online"
- Stats grid: 2 columns showing total checks (1,248) and avg latency (6.4s)

**Header (sticky, `h-16`):**
- Background: `bg-background/80 backdrop-blur-xl`
- Left (mobile only): hamburger menu button (`Menu` icon, `lg:hidden`)
- Left (mobile only): KREDO logo tile (no wordmark)
- Left (desktop): breadcrumb — `Workspace > {view}` with `ChevronRight` separators
- Center: flex spacer
- Right: pipeline uptime pill — `bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25`, shows "pipeline · 99.4% uptime" with a pulsing dot
- Right: GitHub link (`Github` icon, links to https://github.com/Nayan10001/KREDO)

**Mobile drawer:**
- Triggered by hamburger button (`lg:hidden`)
- Overlay: `fixed inset-0 z-40 bg-background/80 backdrop-blur-sm`
- Drawer: `fixed left-0 top-0 bottom-0 z-50 w-72 bg-sidebar`
- Animation: spring (damping 30, stiffness 300), `x: -320 → 0`

**View transitions:**
- Wraps children in `AnimatePresence mode="wait"`
- Each view: `motion.div` with `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -8 }}`
- Duration: 0.25s, easing: `[0.22, 1, 0.36, 1]`

---

## 9. Verify View

### 9.1 `<VerifyView />`

**File:** `src/components/kredo/views/verify-view.tsx`

The heart of KREDO. Two states: a hero input (initial) and a chat-style streaming view (during/after analysis).

**State machine:**
```
[Hero Input] ──submit──> [Chat Stream (pipeline running)] ──complete──> [Chat Stream (verdicts)]
       ↑                                                                                │
       └──────────────────────────────"New analysis"─────────────────────────────────────┘
```

#### 9.1.1 Hero Input State

**Layout (centered, max-w-3xl):**

```
                    [● 7-agent pipeline · 12 Indic languages]
                    
                    Unmask the truth.
                    One claim at a time.
                    
                    Drop a news link, paste an article, or upload an
                    image. Seven AI agents extract claims, retrieve
                    evidence, score sources, and render per-claim
                    verdicts — with full chain-of-thought reasoning.
                    
                    ┌─────────────────────────────────────────────┐
                    │ [URL] [Text]                       https:// │
                    │ ├──────────────────────────────────────────┤ │
                    │ │ https://example.com/article-to-verify    │ │
                    │ ├──────────────────────────────────────────┤ │
                    │ │ 📷                              ↵ submit  │ │
                    │ │                              [Verify →]  │ │
                    │ └──────────────────────────────────────────┘ │
                    └─────────────────────────────────────────────┘
                    
                    TRY A SAMPLE
                    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                    │ 🔗 Credible │ │ 📝 WhatsApp │ │ ✨ Suspicious│
                    │   news      │ │   forward   │ │   blog claim│
                    └─────────────┘ └─────────────┘ └─────────────┘
```

**Hero badge:** `inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25`
- Pulsing dot + `text-[11px] uppercase tracking-wider text-emerald-300 font-mono`
- Text: "7-agent pipeline · 12 Indic languages"

**Hero title:**
- `font-bold tracking-tight text-4xl lg:text-6xl leading-[1.05]`
- Two lines: "Unmask the truth." (foreground) + "One claim at a time." (gradient)
- Gradient: `bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent`

**Hero subtitle:** `text-muted-foreground text-base lg:text-lg max-w-xl mb-8`

**Input card:**
- Container: `rounded-2xl bg-card/60 backdrop-blur-xl ring-1 ring-inset ring-border shadow-2xl shadow-black/40 kredo-gradient-border`
- Mode tabs (`URL`, `Text`): `flex items-center gap-1 p-3 pb-0`
  - Active: `bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30`
  - Inactive: `text-muted-foreground hover:text-foreground hover:bg-muted/60`
- URL input: `w-full bg-transparent px-3 py-3 text-base font-mono outline-none placeholder:text-muted-foreground/40`
- Text textarea: same styling, `text-sm`, `resize-none max-h-40 overflow-y-auto`, auto-resizes via `useEffect`
- Action row: `flex items-center justify-between px-3 pb-3 pt-2 border-t border-border/60`
  - Image upload button (placeholder): `grid place-items-center h-9 w-9 rounded-lg hover:bg-muted`
  - Submit hint: `text-[11px] font-mono text-muted-foreground/60` — "↵ to submit" or "⌘ + ↵ to submit"
  - Submit button: `<Button>` with `bg-emerald-500/90 hover:bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/20 gap-1.5`, label "Verify" + `ArrowRight` icon

**Sample prompts (3 cards):**

| Label | Icon | Value |
|---|---|---|
| Credible news article | `Link2` | `https://thehindu.com/news/national/government-approves-new-rail-budget` |
| WhatsApp forward text | `Type` | `Drinking warm water with lemon every morning cures cancer in 30 days, scientists confirm` |
| Suspicious blog claim | `Sparkles` | `https://randomblog.xyz/2025/06/breaking-miracle-cure-for-diabetes-found` |

Card styling: `group flex items-start gap-2.5 p-3 rounded-xl bg-card/40 ring-1 ring-inset ring-border hover:ring-emerald-500/40 hover:bg-emerald-500/5 transition text-left`

#### 9.1.2 Chat Stream State

**Layout (max-w-4xl, px-4 lg:px-8 py-8):**

Two message bubbles:
1. **User bubble (right-aligned):** `rounded-2xl rounded-tr-sm bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30 px-4 py-3`, max-w-85%
   - Eyebrow: `text-[10px] font-mono uppercase tracking-wider text-emerald-400/70` — "{type} · you"
   - URL: clickable link, `text-sm font-mono text-emerald-100 underline decoration-emerald-500/40`
   - Text: `text-sm text-emerald-50/90 whitespace-pre-wrap`, truncated at 400 chars

2. **Assistant bubble (left-aligned, full width):** `rounded-2xl rounded-tl-sm bg-card/60 ring-1 ring-inset ring-border px-4 lg:px-6 py-4 lg:py-5`
   - Header: small KREDO logo tile + "KREDO · multi-agent pipeline" + (while running) spinner + "running" label
   - Body: `<AgentPipeline />` component (see 9.2)
   - On completion: `<VerdictDisplay />` + "New analysis" button

---

### 9.2 `<AgentPipeline />`

**File:** `src/components/kredo/verify/agent-pipeline.tsx`

The streaming 7-agent pipeline visualization. Reimagined from the original KREDO `AgentChain` component — same logic, modernized styling.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `thoughts` | `AgentThought[]` | Streamed agent events from the backend (or mock) |
| `isComplete` | `boolean` | Whether the pipeline has finished |

**Agent stages (in order):**

| # | ID | Label | Icon |
|---|---|---|---|
| 00 | `init` | Pipeline Initialisation | `Zap` |
| 01 | `multilingual` | Multilingual Translator | `Globe` |
| 02 | `claim_extraction` | Claim Extraction | `FileSearch` |
| 03 | `evidence_retrieval` | Evidence Retrieval | `Search` |
| 04 | `source_credibility` | Source Credibility | `Shield` |
| 05 | `fact_checker` | Fact Checker | `Scale` |
| 06 | `explanation_generator` | Explanation Generator | `MessageSquare` |
| 07 | `image_integrity` | Image Integrity | `Image` |

**Section card states:**

| State | Background | Ring | Indicator |
|---|---|---|---|
| `pending` | (not rendered) | — | — |
| `active` | `bg-emerald-500/5` | `ring-emerald-500/25` | Pulsing dot + "running" label |
| `done` | `bg-card/40` | `ring-border` | Green check + "done" label + duration |

**Section card layout:**

```
┌────────────────────────────────────────────────────────────┐
│ [✓] 02  Claim Extraction                0.9s  done         │
│                                                              │
│  • Extracted 3 checkable claims                              │
│  • "The Indian government has approved a record ₹2.4…"       │
│  • "This is the largest-ever single-year railway…"            │
│  • "The new budget will create 50 lakh direct jobs…"         │
└────────────────────────────────────────────────────────────┘
```

- Header: 28×28 icon tile + `00`-padded index + label + duration (right) + status (right)
- Icon tile (done): `bg-emerald-500/10 text-emerald-400` with `Check` icon (strokeWidth 3)
- Icon tile (active): `bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30` with the agent's lucide icon
- Items: stagger-revealed every 110ms, each is a `motion.div` with `initial={{ opacity: 0, y: 4 }}`, `animate={{ opacity: 1, y: 0 }}`
- Item dot colors by kind:
  - `info` → `bg-emerald-400/60`
  - `search` → `bg-violet-400/60`
  - `score` → `bg-amber-400/60`
  - `final` → `bg-emerald-400`
  - `warn` → `bg-rose-400/80`

**Progress bar (top, while running):**
- Container: `h-0.5 w-full bg-muted/40 rounded-full overflow-hidden`
- Fill: `motion.div` with `bg-emerald-400`, width animates to `${(activeSections.length / 8) * 100}%`

**Thinking placeholder (active section with no items yet):**
- Three pulsing dots with staggered delays (0s, 0.2s, 0.4s)
- "Processing" label in `font-mono`

#### 9.2.1 `<VerdictCoTCard />` (internal to AgentPipeline)

Renders inside the Fact Checker section — one card per claim verdict.

**Anatomy:**

```
┌────────────────────────────────────────────────────────────┐
│ [✓] SUPPORTED                          87/100    [HIGH]    │
├────────────────────────────────────────────────────────────┤
│ "The Indian government has approved a record ₹2.4 lakh…"   │
│                                                              │
│ 🧠 Figure matches the Union Budget 2025-26 allocation…     │
│                                                              │
│ ⚠ Gap: Article does not specify whether 'largest' refers… │
│                                                              │
│  ▼ View chain of thought                                    │
└────────────────────────────────────────────────────────────┘
```

- Container: `rounded-xl bg-background/40 ring-1 ring-inset ring-border overflow-hidden`
- Header row: 24×24 verdict icon tile (verdict-color background + icon) + verdict label + score + confidence badge
- Verdict icon mapping:
  - `SUPPORTED` → `Check` icon, color `oklch(0.78 0.18 155)`
  - `CONTRADICTED` → `AlertTriangle`, `oklch(0.65 0.22 25)`
  - `MISLEADING` → `AlertTriangle`, `oklch(0.82 0.16 75)`
  - `UNVERIFIED` → `Brain`, `oklch(0.68 0.012 250)`
- Claim text: `text-sm text-foreground/90 italic leading-relaxed`, truncated at 160 chars
- Reasoning summary: `Brain` icon (violet) + `text-xs text-muted-foreground leading-relaxed`
- Evidence gaps: `AlertTriangle` (amber) + `text-[11px] text-muted-foreground/80`, max 2 shown
- CoT toggle button: `w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground transition border-t border-border/60`
- Expanded panel: `motion.div` with `height: 0 → auto`, `bg-background/60 space-y-2.5 max-h-72 overflow-y-auto`
- Reasoning text is parsed by `parseReasoningSections()` — splits on `^\d+\. (.+)$` lines into heading/body pairs

---

### 9.3 `<VerdictDisplay />`

**File:** `src/components/kredo/verify/verdict-display.tsx`

The final result panel — renders inside the assistant bubble after `isComplete`.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `result` | `StreamResult` | Final streamed result (verdicts, explanations, citations, media) |

**Sections:**

#### 9.3.1 Language badge (conditional)

Shown only if `result.isTranslated` is true.

`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 ring-1 ring-inset ring-violet-500/25`
- `Languages` icon (violet) + "Analysed in {language} · translated via Sarvam AI"

#### 9.3.2 Media risk banner (conditional)

Shown only if `result.mediaRiskLevel === "HIGH"`.

`flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 ring-1 ring-inset ring-rose-500/30`
- `ImageOff` icon (rose) + "Media Integrity Alert" + details

#### 9.3.3 Overall verdict — hero block

`rounded-2xl bg-card/60 ring-1 ring-inset ring-border p-5 lg:p-6 kredo-gradient-border`

Layout: `flex flex-col lg:flex-row items-center gap-6`

- **Left:** `<TruthMeter size={150} label="Trust Score" sublabel="{n} claims" />`
- **Right:**
  - Eyebrow: `text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70` — "Overall Verdict"
  - Headline: `text-2xl lg:text-3xl font-bold tracking-tight` + `<VerdictBadge size="lg" />`
  - Bottom line: `text-sm text-muted-foreground leading-relaxed`
  - Actions: "Copy report" button (with `Copy`/`Check` icon swap on click) + "Export PDF" button (`Download` icon)

#### 9.3.4 Per-claim analysis

Section eyebrow: `text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70` — "Detailed Claim Analysis · {n} claims"

Each claim is a `motion.div` with staggered delay (`idx * 0.08`), styled as:
`rounded-xl bg-card/40 ring-1 ring-inset ring-border overflow-hidden`

**Claim card anatomy:**

```
┌────────────────────────────────────────────────────────────┐
│ 01  "The Indian government has approved a record ₹2.4…"    │
│                                                              │
│ [● Supported] 87/100  [HIGH]                                │
│                                                              │
│ ┌─ plain english ────────────────────────────────────────┐ │
│ │ The ₹2.4 lakh crore figure and 15% YoY increase are   │ │
│ │ both correct, sourced directly from the Union Budget… │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ℹ High confidence — primary government source + …          │
│ 🛡 Sources are T1 (Reuters, PTI) plus the primary …        │
│ ⚠ Watch for headline framing that inflates Indian …        │
│ ❓ Original source for 50 lakh figure is unnamed…          │
│                                                              │
│ SOURCES                                                      │
│ [1] https://indianrailways.gov.in/...                       │
│ [2] https://reuters.com/world/india/...                     │
└────────────────────────────────────────────────────────────┘
```

- Index: `font-mono text-xs text-muted-foreground/60 tabular-nums`
- Claim text: `text-sm text-foreground leading-relaxed italic`
- Plain English block: `p-3 rounded-lg bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/15`
- Meta notes use `<MetaNote />` internal component:
  - `Info` icon → confidence_statement
  - `ShieldCheck` → source_quality_note
  - `AlertTriangle` (amber) → reader_advisory (variant: warn)
  - `ShieldQuestion` (muted) → evidence_gaps_plain (variant: muted)
- Citations: numbered `[1]`, `[2]`... in emerald mono, hover reveals `ExternalLink` icon

---

## 10. Dashboard View

### 10.1 `<DashboardView />`

**File:** `src/components/kredo/views/dashboard-view.tsx`

Platform analytics overview. Six KPI cards + two charts + two breakdown cards + recent checks list.

**Header:**
- Title: `text-2xl lg:text-3xl font-bold tracking-tight` — "Dashboard"
- Subtitle: `text-sm text-muted-foreground mt-1` — "Platform analytics across all fact-checks · last 14 days"
- Right: trend pill — `bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25` with `TrendingUp` icon + "+18% checks vs. prior 14 days"

### 10.2 Stat cards (6-up grid)

`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3`

| Card | Label | Value | Sub | Icon | Color |
|---|---|---|---|---|---|
| 1 | Total Checks | 1,248 | +12% this week | `Activity` | emerald |
| 2 | Avg Trust Score | 67/100 | across all claims | `ShieldCheck` | emerald |
| 3 | Avg Latency | 6.4s | end-to-end pipeline | `Clock` | amber |
| 4 | Claims Verified | 5,847 | 14,238 sources cited | `CheckCircle2` | emerald |
| 5 | Languages | 12 | Indic + English | `Languages` | violet |
| 6 | High-Risk Images | 87 | EXIF tamper detected | `Zap` | rose |

**Card styling:**
- Container: `<Card>` with `p-4 bg-card/40 backdrop-blur-sm`
- Icon tile: 28×28, background = `color-mix(in oklch, {color} 14%, transparent)`, color = `{color}`
- Value: `font-mono text-xl font-bold tabular-nums`
- Label: `text-[11px] text-muted-foreground mt-0.5`
- Sub: `text-[10px] text-muted-foreground/60 mt-1`

**Color map:**
```ts
emerald: "oklch(0.78 0.18 155)"
amber:   "oklch(0.82 0.16 75)"
violet:  "oklch(0.70 0.18 300)"
rose:    "oklch(0.65 0.22 25)"
```

### 10.3 Verdict Trend chart (Recharts AreaChart)

`lg:col-span-2`, height 256px.

- 14 data points (Jun 08 → Jun 21)
- Three areas: `credible` (emerald), `mixed` (amber), `unreliable` (rose)
- Each area uses a vertical gradient fill (40% → 0% opacity)
- Grid: `strokeDasharray="3 3"` with `oklch(1 0 0 / 6%)`
- Axis labels: `fill: oklch(0.68 0.012 250)`, `fontSize: 10`, `fontFamily: monospace`
- Tooltip: `background: oklch(0.205 0.014 250)`, `border: 1px solid oklch(1 0 0 / 10%)`, `borderRadius: 8px`, `fontFamily: monospace`
- Custom legend above the chart: three colored dots + labels

### 10.4 Verdict Distribution chart (Recharts PieChart)

Donut chart, height 192px.

- 4 segments: Credible (42, emerald), Mixed (18, amber), Unreliable (31, rose), Unverified (9, slate)
- `innerRadius={48} outerRadius={72} paddingAngle={2}`, no stroke
- Below: 2-column legend grid with colored dot + name + count

### 10.5 Input Types chart (Recharts BarChart)

Height 160px. Three bars (URL 68, Text 22, Image 10) in emerald with `radius={[6, 6, 0, 0]}`.

### 10.6 Language Coverage (custom progress bars)

Five languages with horizontal progress bars:
- English 71%, Hindi 14%, Tamil 6%, Bengali 5%, Other Indic 4%
- Bar: `w-32 h-1.5 rounded-full bg-muted/60`, fill `bg-emerald-400/80`

### 10.7 Recent Checks list

Top 5 from `MOCK_HISTORY`. Each row:
- `VerdictBadge size="sm"` + summary + meta line (inputType · claims · sources · language) + right-aligned trust score

---

## 11. Agents View

### 11.1 `<AgentsView />`

**File:** `src/components/kredo/views/agents-view.tsx`

Interactive explorer of the 7-agent pipeline.

**Header:**
- Title: "The Pipeline"
- Subtitle: "KREDO runs every input through a 7-agent LangGraph pipeline — plus a feedback loop that re-analyses text found in images. Click any agent to inspect its role, model, inputs, and outputs."

### 11.2 Pipeline diagram

`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 lg:gap-2`

Eight clickable agent nodes connected by a horizontal gradient line on desktop (`hidden lg:block`, `bg-gradient-to-r from-emerald-500/20 via-emerald-500/40 to-emerald-500/20`).

**Node anatomy:**
- 56×56 circle with the agent's color tinted background, 2px colored ring, color-tinted icon
- Index badge: 20×20 circle, top-right, shows agent index (0–7) in mono
- Below: short label + avg duration in mono

**Color per agent (from `AGENTS` array):**

| Agent | Color (OKLCH) |
|---|---|
| Init | `oklch(0.78 0.18 155)` emerald |
| Multilingual | `oklch(0.72 0.14 230)` sky |
| Claim Extraction | `oklch(0.78 0.16 75)` amber |
| Evidence Retrieval | `oklch(0.70 0.18 300)` violet |
| Source Credibility | `oklch(0.70 0.16 195)` teal |
| Fact Checker | `oklch(0.65 0.22 25)` rose |
| Explanation Generator | `oklch(0.76 0.14 290)` magenta |
| Image Integrity | `oklch(0.78 0.18 155)` emerald |

### 11.3 Feedback loop callout

Below the diagram, a violet-tinted card:

`mt-10 lg:mt-12 p-4 rounded-xl bg-violet-500/8 ring-1 ring-inset ring-violet-500/25`

- Icon: `ArrowLeftRight` (violet) in 36×36 tile
- Title: "Conditional feedback loop · Agent 6 → Agent 1"
- Body explains the OCR-based feedback edge in LangGraph

### 11.4 `<AgentDetail />` panel

Expands inline (animated height) when a node is clicked.

`<Card>` with `mt-6 p-6 bg-card/60 backdrop-blur-xl kredo-gradient-border`, border tinted with agent color.

**Anatomy:**
- 56×56 icon tile with agent color, drop-shadow glow
- Agent index eyebrow + agent ID pill (lowercase, hyphenated)
- Title: agent's full label
- Role line in muted text
- Description paragraph
- 3-column detail grid: Model, Avg duration, Stage — each in a `p-3 rounded-lg bg-background/40 ring-1 ring-inset ring-border`
- 2-column inputs/outputs grid

### 11.5 All-agents grid

Below the diagram, a 4-column grid of compact agent cards.

Each card: `p-4 rounded-xl bg-card/40 ring-1 ring-inset ring-border hover:ring-emerald-500/30 hover:bg-emerald-500/5 transition`

- 36×36 icon tile
- "Agent {n}" eyebrow + short label
- 2-line role description (line-clamped)
- Footer: avg duration + `ChevronRight` (animated on hover)

---

## 12. History View

### 12.1 `<HistoryView />`

**File:** `src/components/kredo/views/history-view.tsx`

Past fact-checks with search and type filters.

**Header:**
- Title: "History"
- Subtitle: "{filtered} of {total} checks · avg trust {avg}/100"
- Right: "Export CSV" button (`Download` icon, outline variant)

### 12.2 Search + filter bar

`flex flex-col sm:flex-row gap-3 mb-5`

- Search input: `<Input>` with leading `Search` icon, `pl-9 bg-card/40 font-mono text-sm`, placeholder "Search by URL, language, or verdict…"
- Filter segmented control: `flex items-center gap-1 p-1 rounded-lg bg-card/40 ring-1 ring-inset ring-border`
  - `Filter` icon + 4 buttons: All / URL / Text / Image
  - Active: `bg-emerald-500/15 text-emerald-300`
  - Inactive: `text-muted-foreground hover:text-foreground`

### 12.3 `<HistoryRow />`

`<Card>` with `p-4 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition cursor-pointer group`

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│ [🔗]  [● Credible] [Hindi]                                  │
│      thehindu.com/news/national/government-approves-new…    │
│      🕐 5h ago  •  4 claims  •  9 sources  •  7.2s          │
│                                              84             │
│                                            /100      →      │
└────────────────────────────────────────────────────────────┘
```

- Left: 40×40 type icon tile, colored by verdict (uses `verdictStyle()`)
- Middle:
  - Row 1: `<VerdictBadge size="sm" />` + optional language pill (`bg-violet-500/12 text-violet-300 ring-1 ring-inset ring-violet-500/25`)
  - Row 2: summary text, `text-sm text-foreground/90 truncate font-mono`
  - Row 3: meta line in `text-[11px] text-muted-foreground/70 font-mono` — relative time + claims + sources + duration
- Right: large trust score (`font-mono text-2xl font-bold tabular-nums`), colored by verdict
- Far right: `ChevronRight` (animated on hover)

**Type icons:**
- URL → `Link2`
- Text → `Type`
- Image → `Image`

**Relative time helper:** `formatRelativeTime(iso)` returns "just now" / "{n}h ago" / "{n}d ago", computed against a fixed reference time (2025-06-21T16:00:00Z).

---

## 13. Sources View

### 13.1 `<SourcesView />`

**File:** `src/components/kredo/views/sources-view.tsx`

Source credibility leaderboard with tier filtering.

**Header:**
- Title: "Source Library"
- Subtitle: "{n} sources scored & ranked by Agent 3 · tiered credibility used during fact-checking"

### 13.2 Top source spotlight

`<Card>` with `p-5 bg-gradient-to-br from-emerald-500/12 to-transparent ring-1 ring-inset ring-emerald-500/25 kredo-gradient-border`

- 56×56 trophy tile (`Trophy` icon, emerald)
- "MOST CREDIBLE SOURCE" eyebrow + T1 pill
- Domain name (large), category · cited count · bias label
- Right: huge score in emerald mono

### 13.3 Search + tier filter

Same pattern as History view. Tiers: All / Tier 1 / Tier 2 / Tier 3.

### 13.4 Source table

`<Card>` with `bg-card/40 backdrop-blur-sm overflow-hidden`

**Header row (desktop only):**
`hidden md:grid grid-cols-12 gap-3 px-4 py-3 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60`

| Column | Width | Content |
|---|---|---|
| # | 1/12 | Rank |
| Domain | 4/12 | Globe icon + domain + external link + tier pill |
| Category | 2/12 | Category text |
| Bias | 2/12 | Bias label |
| Cited | 1/12 (right) | Citation count |
| Avg score | 2/12 (right) | Progress bar + numeric score |

**`<SourceRow />`:**
- Rank: `font-mono text-xs text-muted-foreground/60 tabular-nums`, 2-digit padded
- Domain link: `text-sm font-mono text-foreground hover:text-emerald-300 transition truncate`
- Tier pill:
  - T1 → `bg-emerald-500/12 text-emerald-300 ring-emerald-500/30`
  - T2 → `bg-amber-500/12 text-amber-300 ring-amber-500/30`
  - T3 → `bg-rose-500/12 text-rose-300 ring-rose-500/30`
- Score bar: `h-1.5 w-full md:w-20 rounded-full bg-muted/60`, fill colored by score band
- Score number: `font-mono text-sm font-bold tabular-nums`

**Score color bands (via `scoreColor()`):**

| Score | Color |
|---|---|
| ≥ 80 | `oklch(0.78 0.18 155)` emerald |
| 60–79 | `oklch(0.82 0.16 75)` amber |
| 40–59 | `oklch(0.78 0.16 50)` orange |
| < 40 | `oklch(0.65 0.22 25)` rose |

### 13.5 Tier legend (3-card grid)

Three cards explaining each tier:

| Tier | Icon | Color | Description |
|---|---|---|---|
| T1 | `ShieldCheck` | emerald | Wire services, established broadcast, institutional primary sources. Highest editorial standards. |
| T2 | `Shield` | amber | Mainstream national & international outlets. Generally reliable but may carry editorial slant. |
| T3 | `ShieldAlert` | rose | User-generated, anonymous, or unvetted. Treated with strong scepticism during fact-checking. |

Each card shows tier name + count of sources + average score, then the description.

**Bias labels:**

| Key | Display |
|---|---|
| `left` | Left |
| `center-left` | Center-Left |
| `center` | Center |
| `center-right` | Center-Right |
| `right` | Right |

---

## 14. Animation Specifications

All animations use **Framer Motion** unless noted.

### 14.1 View transitions

```ts
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
```

### 14.2 Sidebar active indicator

Shared layout animation via `layoutId="sidebar-active"`:
```tsx
<motion.span layoutId="sidebar-active" 
  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r bg-emerald-400" />
```
Automatically animates between nav items when `view` changes.

### 14.3 Mobile drawer

```ts
initial={{ x: -320 }}
animate={{ x: 0 }}
exit={{ x: -320 }}
transition={{ type: "spring", damping: 30, stiffness: 300 }}
```

### 14.4 Stagger reveals

Used for stat cards, history rows, source rows, sample prompts:
```ts
transition={{ delay: i * 0.04 }}  // or 0.05, 0.06, 0.08 depending on density
```

### 14.5 Pipeline item reveal

Each item in an agent section:
```ts
initial={{ opacity: 0, y: 4 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.25 }}
```
Reveal cadence controlled by `setInterval` at 110ms between items.

### 14.6 Truth meter arc fill

Custom `requestAnimationFrame` loop:
- Duration: 1200ms
- Easing: `1 - (1-t)³` (easeOutCubic)
- Updates both the arc stroke-dasharray and the numeric display

### 14.7 CoT card expand/collapse

```ts
initial={{ height: 0, opacity: 0 }}
animate={{ height: "auto", opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
```
Wrapped in `<AnimatePresence>`.

### 14.8 CSS keyframe animations

| Name | Duration | Iteration | Use |
|---|---|---|---|
| `kredo-shimmer` | 2s | infinite linear | Loading shimmer |
| `kredo-pulse-dot` | 1.6s | infinite ease-in-out | Status dots |
| `kredo-blink` | 1.1s | infinite step-end | Cursors |
| `kredo-fade-in-up` | 0.4s | once | Item entrance |

### 14.9 Hover micro-interactions

| Element | Hover effect |
|---|---|
| Nav items | Background fade-in, text color shift |
| Sample prompt cards | Ring color → emerald, bg → emerald/5 |
| History rows | Background → card/60, ChevronRight slides right |
| Source rows | Background → muted/30 |
| Agent cards | Ring → emerald, bg → emerald/5, ChevronRight slides right |
| Submit button | Background → emerald-400 |

---

## 15. Iconography

**Library:** `lucide-react` (version 0.525.0)

### 15.1 Icons used across KREDO

| Icon | Used in |
|---|---|
| `ShieldCheck` | Verify nav, dashboard stat card, meta notes (source quality) |
| `LayoutDashboard` | Dashboard nav |
| `Network` | Agents nav |
| `History` | History nav |
| `Library` | Sources nav |
| `Menu` | Mobile hamburger |
| `X` | Mobile drawer close |
| `Github` | Header GitHub link |
| `ChevronRight` | Breadcrumbs, history/source row arrows |
| `ChevronDown` | CoT card toggle |
| `Plus` | New analysis button |
| `Image` (`ImageIcon`) | Image upload, image-type rows, Image Integrity agent |
| `ImageOff` | Media risk banner |
| `Loader2` | Spinner (with `animate-spin`) |
| `Link2` | URL input mode, URL-type rows |
| `Type` | Text input mode, text-type rows |
| `Sparkles` | Sample prompts, assistant bubble header |
| `ArrowRight` | Submit button, input list markers |
| `ArrowLeftRight` | Feedback loop callout |
| `Zap` | Init agent, stat card (high-risk images) |
| `Globe` | Multilingual agent, language coverage, source rows |
| `FileSearch` | Claim Extraction agent |
| `Search` | Evidence Retrieval agent, search inputs |
| `Shield` | Source Credibility agent, T2 tier |
| `ShieldAlert` | T3 tier |
| `ShieldQuestion` | Meta notes (evidence gaps), no-claims state |
| `Scale` | Fact Checker agent |
| `MessageSquare` | Explanation Generator agent |
| `Brain` | Reasoning summary, UNVERIFIED verdict |
| `AlertTriangle` | MISLEADING/CONTRADICTED verdict, evidence gaps, reader advisories |
| `Check` | Verdict CoT header (SUPPORTED), copy-success, completed pipeline stages |
| `CheckCircle2` | Stat card (claims verified) |
| `Info` | Meta notes (confidence statement) |
| `Languages` | Language badge, stat card (languages) |
| `Clock` | Avg latency, agent duration |
| `Cpu` | Model field in agent detail |
| `TrendingUp` | Dashboard trend pill |
| `Activity` | Stat card (total checks) |
| `Trophy` | Top source spotlight |
| `ExternalLink` | Citation hover, source domain rows |
| `Download` | Export buttons |
| `Copy` | Copy report button |
| `Filter` | Filter segmented controls |
| `FileText` | (Available, unused in current build) |

### 15.2 Icon sizing convention

| Context | Size | strokeWidth |
|---|---|---|
| Body inline icons | `h-3.5 w-3.5` (14px) | 2 (default) |
| Card header icons | `h-4 w-4` (16px) | 2 |
| Sidebar nav icons | `h-4 w-4` / `size={18}` | 2 |
| Stat card icons | `h-3.5 w-3.5` (14px) | 2 |
| Hero badge icons | `h-3.5 w-3.5` | 2 |
| Agent node icons | `h-5 w-5` (20px) | 2 |
| Agent detail header icon | `h-6 w-6` (24px) | 2 |
| Spotlight icons (trophy) | `h-6 w-6` (24px) | 2 |
| Verdict CoT check icons | `h-3.5 w-3.5` | 2.5 |
| Large verdict display | `h-5 w-5` | 2 |

---

## 16. File Structure

```
src/
├── app/
│   ├── globals.css                   # Theme tokens + utilities (see §2, §5)
│   ├── layout.tsx                    # Root layout, fonts, metadata
│   └── page.tsx                      # Root SPA — view switcher
├── components/
│   ├── ui/                           # shadcn/ui primitives (Button, Card, Input, etc.)
│   └── kredo/
│       ├── app-shell.tsx             # §8
│       ├── shared/
│       │   ├── kredo-logo.tsx        # §7.1
│       │   ├── truth-meter.tsx       # §7.2
│       │   └── verdict-badge.tsx     # §7.3
│       ├── verify/
│       │   ├── agent-pipeline.tsx    # §9.2 (includes VerdictCoTCard)
│       │   └── verdict-display.tsx   # §9.3
│       └── views/
│           ├── verify-view.tsx       # §9.1
│           ├── dashboard-view.tsx    # §10
│           ├── agents-view.tsx       # §11 (includes AgentDetail)
│           ├── history-view.tsx      # §12 (includes HistoryRow)
│           └── sources-view.tsx      # §13 (includes SourceRow)
└── lib/
    ├── utils.ts                      # cn() helper
    └── kredo/
        ├── types.ts                  # All TypeScript types
        ├── agents.ts                 # 7-agent metadata
        ├── mock-data.ts              # History, sources, charts data
        └── mock-stream.ts            # Mock SSE pipeline replay
```

---

## 17. Responsive Breakpoints

KREDO uses Tailwind's default breakpoints.

| Breakpoint | Width | Behaviour change |
|---|---|---|
| (default) | < 640px | Single column, mobile drawer for nav, hidden grid headers |
| `sm:` | ≥ 640px | Sample prompts 3-column, agent nodes 4-column, source tier legend 3-column |
| `md:` | ≥ 768px | Stat cards 3-column, source table headers visible, pipeline status pill in header |
| `lg:` | ≥ 1024px | Sidebar persistent (no drawer), stat cards 6-column, agent nodes 8-column, dashboard charts side-by-side, hero title 6xl |
| `xl:` | ≥ 1280px | View max-width caps at `max-w-7xl` (1280px) |

### Key responsive behaviours

- **Sidebar:** hidden below `lg:`, replaced by hamburger + drawer (`w-72`)
- **Header breadcrumbs:** hidden below `lg:`
- **Header pipeline pill:** hidden below `md:`
- **Source table header row:** hidden below `md:` (rows become 2-column on mobile)
- **Dashboard charts:** stack vertically below `lg:`, side-by-side at `lg:`
- **Hero title:** `text-4xl` on mobile, `text-6xl` on `lg:`
- **Hero subtitle:** `text-base` on mobile, `text-lg` on `lg:`
- **Chat stream padding:** `px-4` on mobile, `px-8` on `lg:`
- **Verdict hero block:** stacks vertically on mobile, side-by-side at `lg:`

---

*End of design specification.*

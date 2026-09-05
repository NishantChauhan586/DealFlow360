# DealFlow360 — Project Context & Architecture Master Guide

## 1. Executive Summary & Product Vision

**DealFlow360** is an **Intelligent, Self-Governing Sales Operations Platform** designed to orchestrate the entire quote-to-cash lifecycle for modern enterprise teams. 

Rather than serving as a passive CRM or a simple dashboard, DealFlow360 acts as an active governance and intelligence engine that enforces commercial discipline, provides instant decision transparency, and accelerates deal velocity.

### The Core Deal Lifecycle
```text
QUOTE ──► RISK ──► RECOMMENDATION ──► APPROVAL ──► FULFILLMENT ──► NEGOTIATION ──► RE-APPROVAL ──► BILLING ──► DEAL HEALTH ──► CASH
```

---

## 2. Core Architectural Principles

1. **RULES = TRUTH, AI = INTELLIGENCE**
   - **Deterministic Business Logic**: Controls commercial discount limits, approval thresholds, security permissions, financial risk scores, inventory allocation, and billing proration.
   - **AI Layer**: Provides explainability, contextual upsell/cross-sell recommendations, deal health summaries, anomaly explanations, and negotiation guidance.
   - *Rule*: AI never silently overrides deterministic business rules.

2. **EXPLAIN EVERY IMPORTANT DECISION**
   - Whenever the system flags, blocks, requires approval, or generates a recommendation, it must present:
     - **WHAT happened** (e.g., *Service discount requested: 18%*)
     - **WHY it happened** (e.g., *Deterministic policy cap: 10% | Overage: +8%*)
     - **WHAT happens next** (e.g., *Routed to VP of Sales for Tier-2 signoff*)

3. **BACKEND AS THE SOURCE OF TRUTH**
   - Business calculations (margins, discounts, inventory routing, revenue recognition) must live on the server.
   - Frontend mock data must strictly reflect realistic backend API contracts and stay fully swappable.

4. **FUNCTIONAL OVER DECORATIVE**
   - Every UI component, filter, toggle, quantity stepper, and action button must trigger state changes and realistic interactions.

5. **PERFORMANCE & ACCESSIBILITY FIRST**
   - Lightweight DOM structures, CSS transitions for micro-interactions, Framer Motion for UI states, and selective GSAP/Three.js only for hero visualizers.
   - Fully responsive across Desktop, Laptop, Tablet, and Mobile.

---

## 3. Design System & Aesthetics

DealFlow360 implements a bespoke **editorial luxury enterprise SaaS** aesthetic influenced by Linear, Stripe, Raycast, and Vercel.

### Color Tokens
- `--burnham`: `#00221C` (Deep archival dark tone — primary sidebar & headers)
- `--burnham-700`: `#06342B` (Hover dark surface)
- `--burnham-600`: `#0C4438` (Elevated dark surface)
- `--viridian`: `#438A7E` (Signature emerald accent & active indicators)
- `--viridian-600`: `#367065` (Pressed emerald tone)
- `--viridian-300`: `#86B3A9` (Focus rings and secondary accents)
- `--viridian-100`: `#DCEAE6` (Subtle badges and emerald tints)
- `--paper`: `#F5F7F6` (Main background surface)
- `--paper-2`: `#EAF0EE` (Subtle container & panel fill)
- `--ink`: `#08201A` (Primary typography)
- `--ink-60`: `rgba(8, 32, 26, 0.6)` (Secondary text & metadata)
- `--ink-40`: `rgba(8, 32, 26, 0.4)` (Muted hints & disabled text)
- `--amber`: `#C07A38` (Governance warnings, risk indicators, pending states)
- `--amber-100`: `#F3E3CE` (Amber badge fills)
- `--rose`: `#B04A3D` (Policy breaches, critical margin flags)
- `--rose-100`: `#F1DAD5` (Rose badge fills)
- `--line`: `rgba(8, 32, 26, 0.12)` (Refined hairline borders)
- `--line-dark`: `rgba(220, 234, 230, 0.14)` (Dark container borders)

### Typography & Numerals
- **Headings & Brand**: `Fraunces` (Editorial serif font family)
- **UI & Data**: `Inter` (Sans-serif with `.tnum` tabular figures for financial columns)

---

## 4. Repository Structure & Workspace Layout

```text
DealFlow360/
├── .agents/
│   ├── rules/                           # Architecture, UI, and animation guidelines
│   └── workflows/                       # Page-building & intelligence workflows
├── frontend/
│   ├── admin/                           # Active Admin Portal (Vite + React 19)
│   │   ├── package.json                 # React 19, React Router v7, Recharts, GSAP, Three.js
│   │   ├── vite.config.js
│   │   ├── src/
│   │   │   ├── App.jsx                  # Main AppShell, Topbar & React Router definitions
│   │   │   ├── main.jsx                 # Client entry point
│   │   │   ├── index.css                # Global CSS variables, layout primitives & resets
│   │   │   ├── components/
│   │   │   │   ├── Sidebar.jsx          # Collapsible navigation drawer
│   │   │   │   ├── Icons.jsx            # Standardized vector icon set
│   │   │   │   ├── Animations.jsx       # Motion transitions
│   │   │   │   ├── HeroCanvas.jsx       # Subtle Three.js interactive background
│   │   │   │   └── dashboard/           # Modular Dashboard widgets
│   │   │   │       ├── KPICard.jsx
│   │   │   │       ├── AIInsights.jsx
│   │   │   │       ├── PerformanceChart.jsx
│   │   │   │       ├── PipelineOverview.jsx
│   │   │   │       ├── TaskList.jsx
│   │   │   │       └── ActivityFeed.jsx
│   │   │   ├── data/
│   │   │   │   └── mockData.js          # Central operational dataset & business states
│   │   │   └── pages/
│   │   │       ├── Dashboard.jsx        # Command center & operations overview
│   │   │       ├── Pipeline.jsx         # Lifecycle pipeline & Kanban stage progression
│   │   │       ├── Builder.jsx          # CPQ Quote Builder with live margin governance
│   │   │       ├── Approval.jsx         # Multi-tier approval routing & policy audit
│   │   │       ├── Fulfillment.jsx      # Multi-warehouse allocation & split delivery
│   │   │       ├── Subscriptions.jsx    # Contract terms, recurring MRR & billing schedules
│   │   │       └── Portal.jsx           # Customer counter-proposal & negotiation view
│   └── user/                            # (Planned) Dedicated Customer Negotiation Portal
├── backend/                             # (Planned) Production REST/GraphQL backend & DB
├── dealflow360.html                     # Visual prototype & aesthetic benchmark
└── PROJECT_CONTEXT.md                   # This master context reference
```

---

## 5. Active Admin Portal Pages & Features

| Route | Page | Purpose & Key Interactive Features |
| :--- | :--- | :--- |
| `/` | **Dashboard** | Real-time pipeline value ($1.42M), active deals count, gross margin average (38.4%), revenue charts, AI deal health drawer, and team tasks. |
| `/pipeline` | **Pipeline** | Interactive deal stage tracker across the Quote → Risk → Approval → Fulfillment → Billing stages with risk scores. |
| `/builder` | **Quote Builder** | Dynamic line-item configuration with automated margin calculations, discount tolerance ceilings, and smart add-on recommendations. |
| `/approval` | **Approval Matrix** | Automated tier routing explaining exact breach tolerances, overage deltas, and designated approvers. |
| `/fulfillment`| **Fulfillment** | Multi-warehouse inventory split (US-East, EU-Central, APAC) with split-shipment and backorder management. |
| `/subscriptions` | **Subscriptions** | Contract management with recurring ARR/MRR schedules, proration rules, and one-time billing components. |
| `/portal` | **Customer Portal** | Customer-facing counter-offer sandbox for real-time quotation negotiation and approval. |

---

## 6. Developer Guidelines for Future Add-Ons

1. **State & Mock Contract Management**:
   - Add new datasets or state stores inside `frontend/admin/src/data/mockData.js`.
   - Keep business rule fields explicit (e.g., `discountCeiling`, `marginFloor`, `approvalTier`, `fulfillmentStatus`).
2. **Page Development Workflow**:
   - Create the page in `src/pages/[PageName].jsx`.
   - Register route in `src/App.jsx` and add navigation links in `src/components/Sidebar.jsx`.
   - Use CSS Modules (`[PageName].module.css`) for localized styling while referencing global CSS custom properties.
3. **Consistency**:
   - Maintain the editorial serif headings (`Fraunces`) alongside tabular clean typography (`Inter`).
   - Use the standard alert format: **WHAT happened**, **WHY it happened**, and **WHAT happens next**.

You are the lead frontend engineer for **DealFlow360**.

We are building the application FROM SCRATCH.

## PROJECT STRUCTURE

Current structure:

```text
main-app/
└── frontend/
    └── admin/        ← EXISTING VITE ADMIN PORTAL
```

A separate customer portal will be created later:

```text
frontend/
├── admin/             ← YOUR CURRENT WORK
└── user/              ← FUTURE CUSTOMER PORTAL
```

### CRITICAL SCOPE

You are working ONLY inside:

```text
frontend/admin
```

Do NOT create or modify `frontend/user`.

Do NOT create another Vite application.

Do NOT rebuild the project from scratch if the existing Vite setup already works.

Inspect the existing project first and work with its current structure.

---

# OBJECTIVE

Build the **first production-quality Admin Portal page: Dashboard**.

At the same time, establish the reusable frontend foundation that future Admin Portal pages can use.

This Dashboard becomes the **visual and interaction reference for the entire Admin Portal**.

Do NOT build Deals, Contacts, Companies, Tasks, Analytics, AI Assistant, etc. yet.

---

# PRODUCT

DealFlow360 is a modern business/deal management platform.

The Admin Portal will eventually manage:

- Dashboard
- Deals
- Pipeline
- Contacts
- Companies
- Activities
- Tasks
- Analytics
- AI Assistant
- Settings

The Customer Portal is a separate product experience and will be implemented later.

---

# SOURCE OF TRUTH

I have already defined the application's **Rules and Workflows**.

Treat them as authoritative.

DO NOT:
- recreate them
- modify them
- invent conflicting business logic
- change workflow behavior
- create fake business rules

For this task, focus primarily on the frontend experience.

---

# DESIGN DIRECTION

Create a **premium modern SaaS Admin Portal**.

Reference the quality and simplicity of:

- Linear
- Stripe
- Vercel
- Raycast
- Notion
- modern CRM dashboards
- Awwwards
- Dribbble

Desired feeling:

**Premium / Intelligent / Clean / Fast / Professional / Enterprise-ready**

Prioritize:

- excellent spacing
- strong typography hierarchy
- clean layouts
- subtle borders
- refined shadows
- restrained colors
- high information density without clutter
- excellent responsive behavior
- polished micro-interactions

Avoid:

- excessive glassmorphism
- excessive gradients
- excessive rounded cards
- giant headings
- rainbow UI
- excessive shadows
- unnecessary decoration
- generic Bootstrap appearance
- excessive animation
- visual clutter

---

# APP SHELL

Create a reusable Admin layout.

## Sidebar

Include:

- DealFlow360 branding
- logo/mark
- navigation items
- icons
- active route state
- collapse/expand behavior
- tooltips when collapsed
- responsive mobile behavior

Navigation:

Dashboard
Deals
Pipeline
Contacts
Companies
Activities
Tasks
Analytics
AI Assistant
Settings

The sidebar should feel similar to modern productivity/SaaS applications.

Desktop:
- expandable/collapsible

Mobile:
- appropriate drawer/sheet behavior

Use smooth transitions.

---

# TOP NAVBAR

Create a reusable top navigation bar containing:

- page title
- breadcrumb/context where useful
- global search
- notifications
- quick action
- profile/avatar menu

Keep it clean and compact.

---

# DESIGN SYSTEM

Establish reusable primitives/components for:

- typography
- buttons
- inputs
- cards
- badges
- dropdowns
- tooltips
- modals
- tables
- tabs
- loading states
- empty states
- error states

Create consistent design tokens for:

- colors
- spacing
- radius
- borders
- shadows
- typography
- transitions

Avoid repeatedly hardcoding the same values.

Future pages must be able to reuse this system.

---

# DASHBOARD

Build a polished dashboard.

## Header

Include:

- contextual welcome/title
- short supporting text
- date/workspace context if appropriate
- primary quick action

Keep the header compact.

## KPI SECTION

Create 4–5 important metrics such as:

- Total Pipeline
- Active Deals
- Won Revenue
- Conversion Rate
- Deals Closing Soon

Each KPI should show:

- primary value
- label
- trend/change
- subtle visual indicator

Use realistic demo data.

## PIPELINE OVERVIEW

Create a visual overview of:

Lead
→ Qualified
→ Discovery
→ Proposal
→ Negotiation
→ Won/Lost

Show useful information such as:

- deal count
- pipeline value
- stage distribution

Make this visually strong but easy to scan.

## PERFORMANCE

Create one or two useful charts.

Examples:

- pipeline/revenue trend
- conversion trend
- monthly performance

Charts must be:

- clean
- responsive
- readable
- visually consistent with the design system

Do not add charts merely for decoration.

## RECENT ACTIVITY

Show realistic activity:

- deal updates
- calls
- meetings
- notes
- status changes

Include timestamps and useful context.

## UPCOMING TASKS

Show:

- task
- priority
- due date
- status

Make the section easy to scan.

## AI INSIGHTS

Create a premium AI insight area containing realistic demo insights such as:

- deals requiring attention
- pipeline risk
- follow-up recommendations
- performance observations

Clearly keep demo/mock data separate from the actual data layer.

---

# MODERN ANIMATION SYSTEM

Animations are important.

The interface should feel **alive and premium**, not static.

Use animation inspiration from:

- Linear
- Vercel
- Raycast
- Awwwards
- modern premium SaaS products

Use subtle, purposeful animations.

### Page

- fade + slight upward entrance
- fast and smooth

### KPI Cards

- subtle staggered entrance
- optional number count-up on first render

### Charts

- smooth progressive reveal

### Cards

- subtle hover elevation/border transition

### Sidebar

- smooth collapse/expand
- smooth navigation state transitions

### Buttons

- subtle hover
- press feedback

### Dropdowns

- fade + small scale/translate

### Modals

- backdrop fade
- content entrance

### Tooltips

- quick fade/translate

### Lists

- subtle stagger where useful

### Rules

Most animations should be approximately:

**150–400ms**

Use natural easing.

Avoid:

- excessive bouncing
- long animations
- parallax
- unnecessary motion
- animation everywhere
- layout shifts
- animations that slow interaction

Respect:

`prefers-reduced-motion`

First inspect the existing project for animation libraries.

Prefer existing dependencies.

If none exist, CSS transitions/animations are preferred.

Only introduce ONE animation library if it genuinely improves the implementation.

Do not install multiple animation libraries.

---

# RESPONSIVE DESIGN

The Dashboard must work properly on:

- desktop
- laptop
- tablet
- mobile

Do not simply shrink the desktop version.

Adapt:

- sidebar
- navbar
- KPI grid
- charts
- activity sections
- task sections
- spacing
- typography

The mobile experience must feel intentionally designed.

---

# DATA ARCHITECTURE

Keep the architecture ready for real APIs.

Preferred flow:

```text
UI
 ↓
Components
 ↓
Hooks / State
 ↓
Services / API
 ↓
Backend
```

Backend may not exist yet.

If API data is unavailable:

- use realistic mock data
- keep mock data in dedicated files
- do not hardcode large datasets inside components
- make future API integration straightforward

Do NOT create fake backend functionality.

Do NOT pretend mock data is persistent.

---

# COMPONENT ARCHITECTURE

Keep components reusable and understandable.

Prefer a structure similar to:

```text
src/
├── components/
│   ├── layout/
│   ├── navigation/
│   ├── ui/
│   ├── charts/
│   └── dashboard/
├── pages/
├── hooks/
├── services/
├── data/
├── utils/
└── ...
```

Adapt this to the existing project rather than blindly creating folders.

Avoid giant components.

Avoid unnecessary abstraction.

---

# ACCESSIBILITY

Implement:

- semantic HTML
- keyboard navigation
- visible focus states
- accessible buttons
- accessible form labels
- useful ARIA labels where required
- sufficient contrast

---

# PERFORMANCE

Keep the application fast.

Avoid:

- unnecessary rerenders
- huge dependencies
- excessive animation
- unnecessary state
- duplicated components
- premature complexity

Lazy loading/code splitting can be used where genuinely useful.

---

# IMPORTANT AI-CODING RULES

1. Inspect before changing.
2. Reuse the existing project setup.
3. Do not create another Vite app.
4. Work ONLY inside `frontend/admin`.
5. Do not touch the future `frontend/user`.
6. Do not modify backend code.
7. Do not delete working functionality.
8. Do not add unnecessary dependencies.
9. Do not rewrite unrelated files.
10. Do not create fake backend functionality.
11. Do not add debug/console spam.
12. Do not create huge monolithic components.
13. Keep mock data separate from UI.
14. Build reusable components.
15. Follow one consistent design language.
16. Make animations subtle and production-quality.

---

# EXECUTION ORDER

Follow this exact order:

1. Inspect existing `frontend/admin`
2. Understand current Vite setup
3. Establish design tokens
4. Build reusable UI primitives
5. Build Admin App Shell
6. Build Sidebar
7. Build Top Navbar
8. Build Dashboard
9. Add modern animations
10. Make responsive
11. Run/build/verify
12. Fix relevant issues only

Do not spend tokens explaining your reasoning.

Do not dump unchanged files.

Do not implement future pages.

---

# FINAL REQUIREMENT

This is the **foundation of DealFlow360 Admin Portal**.

The next AI agents will implement the remaining Admin pages.

Therefore, make the Dashboard and shared components polished enough that future agents can simply reuse:

- typography
- spacing
- colors
- cards
- buttons
- navigation
- layouts
- charts
- responsive patterns
- animation patterns

**Do not invent a new visual language later.**

At the end, respond ONLY with:

### Changed
Files/components created or modified.

### Result
What is now working.

### Remaining
What was intentionally left for future implementation.
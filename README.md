# DealFlow360

DealFlow360 is an **Intelligent, Self-Governing Sales Operations Platform** designed to orchestrate the entire quote-to-cash lifecycle for modern enterprise teams.

## Core Lifecycle
`QUOTE ──► RISK ──► RECOMMENDATION ──► APPROVAL ──► FULFILLMENT ──► NEGOTIATION ──► RE-APPROVAL ──► BILLING ──► DEAL HEALTH ──► CASH`

## Architecture Highlights
- **Rules = Truth, AI = Intelligence:** AI provides contextual upsell recommendations and deal health summaries, while deterministic business logic handles commercial thresholds.
- **Backend as Source of Truth:** Business calculations and revenue recognition live securely on the backend APIs.
- **Functional Enterprise UI:** Incorporates a bespoke editorial luxury SaaS aesthetic (React, Framer Motion) ensuring both style and peak performance.

## Project Structure
- `frontend/admin/`: React + Vite admin dashboard for operations, pipeline visualization, and deal governance.
- `frontend/customer/`: React + Vite customer portal for counter-offers and live negotiation.
- `backend/`: Production REST/GraphQL backend handling quotes, approvals, billing, and risk analysis.
- `.agents/`: Workflows and AI behavioral rules.

## Getting Started
See the [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) file for comprehensive architectural guidelines, UI aesthetic specifications, and further details on active modules.
